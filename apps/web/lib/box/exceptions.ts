import { localDateString } from "@78feet/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { classTypeImageUrl } from "./images";
import { personName } from "./map";
import { paginate } from "./pagination";
import { isoDateFromDb, isoDateToDb } from "./time";
import { profileImageUrl } from "./profile-images";

export type ExceptionKind = "extra" | "modified" | "cancelled";

export type ExceptionInstance = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  name: string;
  imageUrl: string | null;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  coachName: string | null;
  coachProfileImageUrl: string | null;
  kinds: ExceptionKind[];
  boxName: string;
};

export function exceptionKinds(row: {
  templateId: string | null;
  editedAt: Date | null;
  status: "scheduled" | "cancelled";
}): ExceptionKind[] {
  const kinds: ExceptionKind[] = [];
  if (row.templateId === null) kinds.push("extra");
  if (row.templateId !== null && row.editedAt !== null) kinds.push("modified");
  if (row.status === "cancelled") kinds.push("cancelled");
  return kinds;
}

export function exceptionKindLabel(kind: ExceptionKind): string {
  if (kind === "extra") return "Clase extra";
  if (kind === "modified") return "Modificada";
  return "Cancelada";
}

/** Etiqueta corta del listado de Excepciones (Extra · Modificada · Cancelada). */
export function exceptionCardStatusLabel(kinds: ExceptionKind[]): string {
  if (kinds.includes("cancelled")) return "Cancelada";
  if (kinds.includes("extra")) return "Extra";
  return "Modificada";
}

/** Instancia que no sigue la plantilla tal cual (extra o tocada como excepción). */
export function isCalendarException(row: { templateId: string | null; editedAt: Date | null }): boolean {
  return row.templateId === null || row.editedAt !== null;
}

function normalizeFromDate(from: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return localDateString(now);
  return from;
}

function exceptionsWhere(from: string): Prisma.ClassInstanceWhereInput {
  return {
    date: { gte: isoDateToDb(from) },
    OR: [{ templateId: null }, { editedAt: { not: null } }, { status: "cancelled" }],
  };
}

const exceptionInclude = {
  classType: true,
  box: { select: { name: true } },
  coach: { select: { id: true, firstName: true, lastName: true, profileImage: { select: { updatedAt: true } } } },
  bookings: { where: { status: "active" as const }, select: { id: true } },
};

type ExceptionRow = {
  id: string;
  date: Date;
  startAt: Date;
  endAt: Date;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  templateId: string | null;
  editedAt: Date | null;
  classType: { name: string; imageKey: string };
  box: { name: string };
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: { updatedAt: Date } | null;
  } | null;
  bookings: { id: string }[];
};

function mapExceptionRow(row: ExceptionRow): ExceptionInstance {
  return {
    id: row.id,
    date: isoDateFromDb(row.date),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    name: row.classType.name,
    imageUrl: classTypeImageUrl(row.classType.imageKey),
    kind: row.kind,
    status: row.status,
    capacity: row.capacity,
    bookedCount: row.bookings.length,
    boxName: row.box.name,
    coachName: personName(row.coach),
    coachProfileImageUrl: row.coach ? profileImageUrl(row.coach.id, row.coach.profileImage?.updatedAt) : null,
    kinds: exceptionKinds({
      templateId: row.templateId,
      editedAt: row.editedAt,
      status: row.status,
    }),
  };
}

export async function listExceptions(from: string, now = new Date()) {
  from = normalizeFromDate(from, now);
  const rows = await prisma.classInstance.findMany({
    where: exceptionsWhere(from),
    include: exceptionInclude,
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
  return rows.map((row) => mapExceptionRow(row as ExceptionRow));
}

export async function listExceptionsPage(from: string, page = 1, now = new Date()) {
  from = normalizeFromDate(from, now);
  const where = exceptionsWhere(from);
  const total = await prisma.classInstance.count({ where });
  return paginate(total, page, async (window) => {
    const rows = await prisma.classInstance.findMany({
      where,
      include: exceptionInclude,
      orderBy: [{ date: "asc" }, { startAt: "asc" }],
      skip: window.skip,
      take: window.take,
    });
    return rows.map((row) => mapExceptionRow(row as ExceptionRow));
  });
}
