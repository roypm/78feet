import { defaultBoxHours, type CreateBox } from "@78feet/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";

export type BoxSummary = {
  id: string;
  name: string;
};

export async function listBoxes(): Promise<BoxSummary[]> {
  return prisma.box.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
}

export function orderBoxes(boxes: readonly BoxSummary[], preferenceBoxId: string | null | undefined): BoxSummary[] {
  if (!preferenceBoxId) return [...boxes];
  const index = boxes.findIndex((box) => box.id === preferenceBoxId);
  if (index <= 0) return [...boxes];
  const preferred = boxes[index]!;
  return [preferred, ...boxes.filter((box) => box.id !== preferenceBoxId)];
}

export function pickBox(
  boxes: readonly BoxSummary[],
  requested: string | undefined,
  preferenceBoxId?: string | null,
): BoxSummary {
  const match = requested ? boxes.find((box) => box.id === requested) : undefined;
  const preferred = preferenceBoxId ? boxes.find((box) => box.id === preferenceBoxId) : undefined;
  const box = match ?? preferred ?? boxes[0];
  if (!box) throw new BoxError(500, "FORBIDDEN", "No hay ningún box");
  return box;
}

/** When `?box=` is set but unknown, return the URL that matches the fallback box. */
export function canonicalBoxRedirect(
  boxes: readonly BoxSummary[],
  requested: string | undefined,
  preferenceBoxId: string | null | undefined,
  hrefFor: (boxId: string) => string,
): string | null {
  if (!requested || boxes.some((box) => box.id === requested)) return null;
  return hrefFor(pickBox(boxes, undefined, preferenceBoxId).id);
}

async function assertUniqueName(name: string, exceptId?: string): Promise<void> {
  const existing = await prisma.box.findFirst({
    where: { name, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new BoxError(409, "FORBIDDEN", "Ya hay un box con ese nombre");
}

export async function createBox(input: CreateBox): Promise<BoxSummary> {
  const hours = defaultBoxHours();
  await assertUniqueName(input.name);
  try {
    return await prisma.box.create({
      data: {
        name: input.name,
        weeklyHours: hours.weekly as Prisma.InputJsonValue,
        exceptions: hours.exceptions as Prisma.InputJsonValue,
      },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new BoxError(409, "FORBIDDEN", "Ya hay un box con ese nombre");
    throw error;
  }
}

export async function renameBox(id: string, input: CreateBox): Promise<BoxSummary> {
  const current = await prisma.box.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!current) throw new BoxError(404, "FORBIDDEN", "El box no existe");
  if (current.name === input.name) return { id, name: input.name };
  await assertUniqueName(input.name, id);
  try {
    return await prisma.box.update({
      where: { id },
      data: { name: input.name },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new BoxError(409, "FORBIDDEN", "Ya hay un box con ese nombre");
    throw error;
  }
}

export async function requireBox(id: string): Promise<BoxSummary> {
  const box = await prisma.box.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!box) throw new BoxError(404, "FORBIDDEN", "El box no existe");
  return box;
}

export async function setPaymentBox(memberId: string, paymentBoxId: string): Promise<{ paymentBoxId: string; paymentBoxName: string }> {
  const [member, box] = await Promise.all([
    prisma.user.findUnique({ where: { id: memberId }, select: { role: true } }),
    requireBox(paymentBoxId),
  ]);
  if (!member || member.role !== "member") throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  await prisma.user.update({ where: { id: memberId }, data: { paymentBoxId: box.id } });
  return { paymentBoxId: box.id, paymentBoxName: box.name };
}

export async function activePaymentCounts(): Promise<{ id: string; name: string; active: number }[]> {
  const [boxes, grouped] = await Promise.all([
    listBoxes(),
    prisma.user.groupBy({
      by: ["paymentBoxId"],
      where: { role: "member", status: "active", paymentBoxId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(grouped.map((row) => [row.paymentBoxId, row._count._all]));
  return boxes.map((box) => ({ id: box.id, name: box.name, active: counts.get(box.id) ?? 0 }));
}
