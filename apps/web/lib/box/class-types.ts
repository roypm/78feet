import { type ClassTypePatch } from "@78feet/domain";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { typeView } from "./map";
import { removeClassTypeImage } from "./images";

export type ClassTypeView = ReturnType<typeof typeView>;

export async function listClassTypes(): Promise<ClassTypeView[]> {
  const rows = await prisma.classType.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] });
  return rows.map(typeView);
}

export async function getClassType(id: string): Promise<ClassTypeView> {
  const row = await prisma.classType.findUnique({ where: { id } });
  if (!row) throw new BoxError(404, "FORBIDDEN", "El tipo no existe");
  return typeView(row);
}

export async function createClassType(input: {
  name: string;
  kind: "directed" | "open";
  imageKey: string;
}): Promise<ClassTypeView> {
  const row = await prisma.classType.create({
    data: { name: input.name, kind: input.kind, imageKey: input.imageKey },
  });
  return typeView(row);
}

export async function updateClassType(
  id: string,
  patch: ClassTypePatch & { imageKey?: string },
): Promise<ClassTypeView> {
  const existing = await prisma.classType.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El tipo no existe");
  const row = await prisma.classType.update({
    where: { id },
    data: {
      name: patch.name ?? existing.name,
      imageKey: patch.imageKey ?? existing.imageKey,
    },
  });
  if (patch.imageKey && patch.imageKey !== existing.imageKey) {
    await removeClassTypeImage(existing.imageKey);
  }
  return typeView(row);
}

export async function deleteClassType(id: string): Promise<{ ok: true }> {
  const existing = await prisma.classType.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El tipo no existe");
  const [instances, trainings, templates] = await Promise.all([
    prisma.classInstance.count({ where: { classTypeId: id } }),
    prisma.training.count({ where: { classTypeId: id } }),
    prisma.classTemplate.count({ where: { classTypeId: id } }),
  ]);
  if (instances > 0 || trainings > 0 || templates > 0) {
    throw new BoxError(409, "CLASS_TYPE_IN_USE");
  }
  await prisma.classType.delete({ where: { id } });
  await removeClassTypeImage(existing.imageKey);
  return { ok: true };
}

export async function requireClassType(id: string) {
  const row = await prisma.classType.findUnique({ where: { id } });
  if (!row) throw new BoxError(404, "FORBIDDEN", "El tipo no existe");
  return row;
}
