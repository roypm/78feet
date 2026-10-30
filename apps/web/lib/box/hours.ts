import {
  boxHoursConfigSchema,
  isOpenDuring,
  isWithinOpeningIntervals,
  BOX_CLOSE_TIME,
  BOX_OPEN_TIME,
  localDateString,
  type BoxHoursConfig,
} from "@78feet/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Db } from "./db";
import { BoxError } from "./errors";
import { clockFromDb } from "./time";

const DEFAULT_ID = "default";

function defaultHours(): BoxHoursConfig {
  return {
    weekly: Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      intervals: [{ openTime: BOX_OPEN_TIME, closeTime: BOX_CLOSE_TIME }],
    })),
    exceptions: [],
  };
}

export async function getBoxHours(db: Db = prisma): Promise<BoxHoursConfig> {
  const row = await db.boxSettings.findUnique({ where: { id: DEFAULT_ID } });
  if (!row) return defaultHours();

  const persisted = row as typeof row & {
    weeklyHours?: unknown;
    exceptions?: unknown;
    openTime?: Date;
    closeTime?: Date;
  };
  if (Array.isArray(persisted.weeklyHours)) {
    return boxHoursConfigSchema.parse({
      weekly: persisted.weeklyHours,
      exceptions: Array.isArray(persisted.exceptions) ? persisted.exceptions : [],
    });
  }

  // A running process can still hold a Prisma Client generated against the old columns.
  if (persisted.openTime instanceof Date && persisted.closeTime instanceof Date) {
    const intervals = [{
      openTime: clockFromDb(persisted.openTime).slice(0, 5),
      closeTime: clockFromDb(persisted.closeTime).slice(0, 5),
    }];
    return {
      weekly: Array.from({ length: 7 }, (_, index) => ({ weekday: index + 1, intervals })),
      exceptions: [],
    };
  }

  // Keep the calendar available until the new client and database migration are active.
  return defaultHours();
}

function instanceClocks(startAt: Date, endAt: Date): { start: string; end: string } {
  const clock = (date: Date) =>
    date.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  return { start: clock(startAt), end: clock(endAt) };
}

function containsWeeklyTemplate(
  config: BoxHoursConfig,
  template: { weekday: number; startTime: Date; endTime: Date },
): boolean {
  const intervals = config.weekly.find((day) => day.weekday === template.weekday)?.intervals ?? [];
  return isWithinOpeningIntervals(intervals, clockFromDb(template.startTime), clockFromDb(template.endTime));
}

async function assertNoScheduledClassOutsideHours(config: BoxHoursConfig, now: Date): Promise<void> {
  const today = localDateString(now);
  const [templates, instances] = await Promise.all([
    prisma.classTemplate.findMany({ where: { active: true } }),
    prisma.classInstance.findMany({
      where: {
        date: { gte: new Date(`${today}T00:00:00.000Z`) },
        startAt: { gt: now },
        status: "scheduled",
      },
      select: { date: true, startAt: true, endAt: true },
    }),
  ]);

  const invalidTemplates = templates.filter((template) => !containsWeeklyTemplate(config, template));
  const invalidInstances = instances.filter((instance) => {
    const date = instance.date.toISOString().slice(0, 10);
    const clocks = instanceClocks(instance.startAt, instance.endAt);
    return !isOpenDuring(config, date, clocks.start, clocks.end);
  });

  if (invalidTemplates.length || invalidInstances.length) {
    const details = [
      invalidTemplates.length ? `${invalidTemplates.length} huecos de plantilla` : null,
      invalidInstances.length ? `${invalidInstances.length} clases programadas` : null,
    ].filter((item): item is string => item !== null);
    throw new BoxError(
      409,
      "SCHEDULE_CLOSED",
      `No se puede guardar el horario: ${details.join(" y ")} quedan fuera. Ajustalos o cancelalos desde Plantilla, Semana o Excepciones.`,
    );
  }
}

export async function updateBoxHours(input: BoxHoursConfig, now = new Date()): Promise<BoxHoursConfig> {
  const config = boxHoursConfigSchema.parse(input);
  const today = localDateString(now);
  if (config.exceptions.some((exception) => {
    const date = new Date(`${exception.date}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== exception.date || exception.date < today;
  })) {
    throw new BoxError(400, "FORBIDDEN", "Cada excepción debe ser una fecha válida de hoy o futura");
  }

  await assertNoScheduledClassOutsideHours(config, now);

  const row = await prisma.boxSettings.upsert({
    where: { id: DEFAULT_ID },
    create: {
      id: DEFAULT_ID,
      weeklyHours: config.weekly as Prisma.InputJsonValue,
      exceptions: config.exceptions as Prisma.InputJsonValue,
    },
    update: {
      weeklyHours: config.weekly as Prisma.InputJsonValue,
      exceptions: config.exceptions as Prisma.InputJsonValue,
    },
  });
  return boxHoursConfigSchema.parse({ weekly: row.weeklyHours, exceptions: row.exceptions });
}

export function calendarAxisRange(config: BoxHoursConfig): { openTime: string; closeTime: string } {
  const intervals = config.weekly.flatMap((day) => day.intervals);
  for (const exception of config.exceptions) intervals.push(...exception.intervals);
  if (intervals.length === 0) return { openTime: BOX_OPEN_TIME, closeTime: BOX_CLOSE_TIME };
  return {
    openTime: intervals.reduce((earliest, interval) => (interval.openTime < earliest ? interval.openTime : earliest), intervals[0]!.openTime),
    closeTime: intervals.reduce((latest, interval) => (interval.closeTime > latest ? interval.closeTime : latest), intervals[0]!.closeTime),
  };
}

export function isDateOpenDuring(config: BoxHoursConfig, date: string, start: string, end: string): boolean {
  return isOpenDuring(config, date, start, end);
}
