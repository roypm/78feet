import {
  boxHoursConfigSchema,
  defaultBoxHours,
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

export async function primaryBoxId(db: Db = prisma): Promise<string> {
  const box = await db.box.findFirst({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (!box) throw new BoxError(500, "FORBIDDEN", "No hay ningún box");
  return box.id;
}

function hoursFromRow(row: { weeklyHours: unknown; exceptions: unknown }): BoxHoursConfig {
  return boxHoursConfigSchema.parse({
    weekly: row.weeklyHours,
    exceptions: Array.isArray(row.exceptions) ? row.exceptions : [],
  });
}

export async function getBoxHours(db: Db = prisma, boxId?: string): Promise<BoxHoursConfig> {
  const row = boxId
    ? await db.box.findUnique({ where: { id: boxId }, select: { weeklyHours: true, exceptions: true } })
    : await db.box.findFirst({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { weeklyHours: true, exceptions: true },
      });
  if (!row) return defaultBoxHours();
  return hoursFromRow(row);
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

async function assertNoScheduledClassOutsideHours(config: BoxHoursConfig, boxId: string, now: Date): Promise<void> {
  const today = localDateString(now);
  const [templates, instances] = await Promise.all([
    prisma.classTemplate.findMany({ where: { active: true, boxId } }),
    prisma.classInstance.findMany({
      where: {
        boxId,
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

export async function updateBoxHours(input: BoxHoursConfig, now = new Date(), boxId?: string): Promise<BoxHoursConfig> {
  const config = boxHoursConfigSchema.parse(input);
  const today = localDateString(now);
  if (config.exceptions.some((exception) => {
    const date = new Date(`${exception.date}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== exception.date || exception.date < today;
  })) {
    throw new BoxError(400, "FORBIDDEN", "Cada excepción debe ser una fecha válida de hoy o futura");
  }

  const targetId = boxId ?? await primaryBoxId();
  await assertNoScheduledClassOutsideHours(config, targetId, now);

  const row = await prisma.box.update({
    where: { id: targetId },
    data: {
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
