import {
  tariffWriteSchema,
  type PatchTariff,
  type TariffWrite,
} from "@78feet/domain";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { parseSchema } from "./parse";

export type TariffView = {
  id: string;
  name: string;
  kind: "monthly" | "pack";
  priceCents: number;
  weeklyDirected: number;
  weeklyOpen: number;
  packClasses: number | null;
  active: boolean;
  createdAt: string;
};

function toView(row: {
  id: string;
  name: string;
  kind: "monthly" | "pack";
  priceCents: number;
  weeklyDirected: number;
  weeklyOpen: number;
  packClasses: number | null;
  active: boolean;
  createdAt: Date;
}): TariffView {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    priceCents: row.priceCents,
    weeklyDirected: row.weeklyDirected,
    weeklyOpen: row.weeklyOpen,
    packClasses: row.packClasses,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTariffs(): Promise<TariffView[]> {
  const rows = await prisma.tariff.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(toView);
}

export async function createTariff(input: TariffWrite): Promise<TariffView> {
  const row = await prisma.tariff.create({ data: input });
  return toView(row);
}

export async function updateTariff(id: string, patch: PatchTariff): Promise<TariffView> {
  const existing = await prisma.tariff.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "La tarifa no existe");
  const next = parseSchema(tariffWriteSchema, {
    name: patch.name ?? existing.name,
    kind: patch.kind ?? existing.kind,
    priceCents: patch.priceCents ?? existing.priceCents,
    weeklyDirected: patch.weeklyDirected ?? existing.weeklyDirected,
    weeklyOpen: patch.weeklyOpen ?? existing.weeklyOpen,
    packClasses: patch.packClasses === undefined ? existing.packClasses : patch.packClasses,
    active: patch.active ?? existing.active,
  });
  const row = await prisma.tariff.update({ where: { id }, data: next });
  return toView(row);
}
