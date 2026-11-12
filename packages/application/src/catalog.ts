import { validateImage } from './profiles.ts';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { DomainError, createBoxSchema, classTypeWriteSchema, classTypePatchSchema, tariffWriteSchema, patchTariffSchema, defaultBoxHours, type ClassTypeWrite, type ClassTypePatch, type TariffWrite, type PatchTariff } from '@78feet/domain';
import { box, classType, classTypeImage, tariff } from '@78feet/db/schema';
import type { Database } from '@78feet/db/connection';

function slugBase(name: string) { return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,80).replace(/-$/, '') || 'item'; }
// Only slug collisions retry. The unique index arbitrates concurrent creates.
async function withSlug<T>(name: string, create: (slug: string) => Promise<T>) {
  const base = slugBase(name);
  for (let n = base === 'todos' ? 2 : 1; ; n++) {
    try { return await create(n === 1 ? base : `${base}-${n}`); }
    catch (error) {
      const cause = (error as { cause?: { code?: string; constraint?: string } }).cause;
      if (cause?.code !== '23505' || !cause.constraint?.endsWith('_slug_key')) throw error;
    }
  }
}
export async function listBoxes(db: Database) { return db.select({ id: box.id, name: box.name, slug: box.slug }).from(box).orderBy(asc(box.createdAt), asc(box.id)); }
export async function createBox(db: Database, input: { name: string }) {
  const { name } = createBoxSchema.parse(input);
  return withSlug(name, async slug => (await db.insert(box).values({ name, slug, weeklyHours: defaultBoxHours().weekly, exceptions: [] }).returning({ id: box.id, name: box.name, slug: box.slug }))[0]);
}
export async function renameBox(db: Database, id: string, input: { name: string }) {
  const values = createBoxSchema.parse(input);
  const [row] = await db.update(box).set(values).where(eq(box.id,id)).returning({ id: box.id, name: box.name, slug: box.slug });
  if (!row) throw new DomainError('FORBIDDEN');
  return row;
}
export async function listClassTypes(db: Database) { return db.select().from(classType).orderBy(asc(classType.kind),asc(classType.name),asc(classType.id)); }
export async function createClassType(db: Database, input: ClassTypeWrite, imageKey: string | null = null) {
  const values = classTypeWriteSchema.parse(input);
  return withSlug(values.name, async slug => (await db.insert(classType).values({ ...values, slug, imageKey }).returning())[0]);
}
export async function updateClassType(db: Database, id: string, input: ClassTypePatch, image?: { mimeType: string; data: Buffer } | null) {
  const values = classTypePatchSchema.parse(input);
  if (image) validateImage(image.data,image.mimeType);
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(classType).where(eq(classType.id,id)).for('update');
    if (!existing) throw new DomainError('FORBIDDEN');
    let imageKey = existing.imageKey;
    if (image !== undefined) {
      imageKey = image ? `db_${randomUUID()}` : null;
      if (image && imageKey) await tx.insert(classTypeImage).values({ id: imageKey, ...image });
    }
    const [updated] = await tx.update(classType).set({ ...values, imageKey }).where(eq(classType.id,id)).returning();
    if (existing.imageKey && existing.imageKey !== imageKey) await tx.delete(classTypeImage).where(eq(classTypeImage.id,existing.imageKey));
    return updated;
  });
}
export async function deleteClassType(db: Database, id: string) {
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(classType).where(eq(classType.id,id)).for('update');
    if (!existing) throw new DomainError('FORBIDDEN');
    const references = await tx.execute(sql`SELECT 1 FROM class_instance WHERE class_type_id=${id}::uuid UNION ALL SELECT 1 FROM training WHERE class_type_id=${id}::uuid UNION ALL SELECT 1 FROM class_template WHERE class_type_id=${id}::uuid LIMIT 1`);
    if (references.rowCount) throw new DomainError('CLASS_TYPE_IN_USE');
    await tx.delete(classType).where(eq(classType.id,id));
    if (existing.imageKey) await tx.delete(classTypeImage).where(eq(classTypeImage.id,existing.imageKey));
    return { ok: true };
  });
}
export async function listTariffs(db: Database) { return db.select().from(tariff).orderBy(desc(tariff.active),asc(tariff.name),asc(tariff.id)); }
export async function createTariff(db: Database, input: TariffWrite) { return (await db.insert(tariff).values(tariffWriteSchema.parse(input)).returning())[0]; }
export async function updateTariff(db: Database, id: string, input: PatchTariff) {
  const patch = patchTariffSchema.parse(input);
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(tariff).where(eq(tariff.id,id)).for('update');
    if (!existing) throw new DomainError('FORBIDDEN');
    const values = tariffWriteSchema.parse({ ...existing, ...patch });
    return (await tx.update(tariff).set(values).where(eq(tariff.id,id)).returning())[0];
  });
}
