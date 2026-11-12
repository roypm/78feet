import type { Prisma } from "@prisma/client";

export const PERSON_SORTS = [
  { value: "apellidos-asc", label: "Apellidos: A–Z" },
  { value: "apellidos-desc", label: "Apellidos: Z–A" },
  { value: "nombre-asc", label: "Nombre: A–Z" },
  { value: "nombre-desc", label: "Nombre: Z–A" },
] as const;
export const TRAINING_SORTS = [
  { value: "recientes", label: "Últimos editados" },
  { value: "antiguos", label: "Primeros editados" },
  { value: "nombre-asc", label: "Nombre: A–Z" },
  { value: "nombre-desc", label: "Nombre: Z–A" },
] as const;
export const PAYMENT_SORTS = [
  { value: "recientes", label: "Últimos registrados" },
  { value: "antiguos", label: "Primeros registrados" },
  { value: "importe-desc", label: "Importe: mayor a menor" },
  { value: "importe-asc", label: "Importe: menor a mayor" },
] as const;
export const TEAM_SORTS = [{ value: "rol", label: "Rol y apellidos" }, ...PERSON_SORTS] as const;

export type PersonSort = typeof PERSON_SORTS[number]["value"];
export type TrainingSort = typeof TRAINING_SORTS[number]["value"];
export type PaymentSort = typeof PAYMENT_SORTS[number]["value"];
export type TeamSort = typeof TEAM_SORTS[number]["value"];

export function selectedSort<T extends string>(options: readonly { value: T }[], value?: string): T {
  return options.find((option) => option.value === value)?.value ?? options[0].value;
}

export function personOrder(order: PersonSort): Prisma.UserOrderByWithRelationInput[] {
  const direction = order.endsWith("desc") ? "desc" : "asc";
  return order.startsWith("nombre")
    ? [{ firstName: direction }, { lastName: direction }, { id: "asc" }]
    : [{ lastName: direction }, { firstName: direction }, { id: "asc" }];
}

export function trainingOrder(order: TrainingSort): Prisma.TrainingOrderByWithRelationInput[] {
  if (order === "nombre-asc" || order === "nombre-desc") {
    return [{ name: order === "nombre-asc" ? "asc" : "desc" }, { id: "asc" }];
  }
  return [{ updatedAt: order === "antiguos" ? "asc" : "desc" }, { id: "asc" }];
}

export function paymentOrder(order: PaymentSort): Prisma.PaymentOrderByWithRelationInput[] {
  if (order === "importe-asc" || order === "importe-desc") {
    return [{ amountCents: order === "importe-asc" ? "asc" : "desc" }, { createdAt: "desc" }, { id: "desc" }];
  }
  return [{ createdAt: order === "antiguos" ? "asc" : "desc" }, { id: "desc" }];
}

export type ListOption = { value: string; label: string };
export type ListFilter = { key: string; label: string; value: string; options: readonly ListOption[] };

export function listOptionsHref(path: string, values: Record<string, string>, order: string, defaultOrder: string): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value && value !== "todos") query.set(key, value);
  if (order !== defaultOrder) query.set("orden", order);
  return query.size ? `${path}?${query}` : path;
}
