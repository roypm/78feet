import { localDateString } from "@78feet/domain";
import { prisma } from "../db";
import { classTypeImageUrl } from "./images";
import { personName } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";

export type ExceptionKind = "extra" | "modified" | "cancelled";

export type ExceptionInstance = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  name: string;
  imageUrl: string;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  coachName: string | null;
  kinds: ExceptionKind[];
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

/** Instancia que no sigue la plantilla tal cual (extra o tocada como excepción). */
export function isCalendarException(row: { templateId: string | null; editedAt: Date | null }): boolean {
  return row.templateId === null || row.editedAt !== null;
}

export async function listExceptions(from: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    from = localDateString(now);
  }
  const rows = await prisma.classInstance.findMany({
    where: {
      date: { gte: isoDateToDb(from) },
      OR: [{ templateId: null }, { editedAt: { not: null } }, { status: "cancelled" }],
    },
    include: {
      classType: true,
      coach: { select: { firstName: true, lastName: true } },
      bookings: { where: { status: "active" }, select: { id: true } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  return rows.map((row) => ({
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
    coachName: personName(row.coach),
    kinds: exceptionKinds({
      templateId: row.templateId,
      editedAt: row.editedAt,
      status: row.status,
    }),
  })) satisfies ExceptionInstance[];
}
