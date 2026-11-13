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

export function exceptionCardStatusLabel(kinds: ExceptionKind[]): string {
  if (kinds.includes("cancelled")) return "Cancelada";
  if (kinds.includes("extra")) return "Extra";
  return "Modificada";
}

export function isCalendarException(row: {
  templateId: string | null;
  editedAt: Date | null;
}): boolean {
  return row.templateId === null || row.editedAt !== null;
}
