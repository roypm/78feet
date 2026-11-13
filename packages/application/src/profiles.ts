import { MissingResource } from "./errors.ts";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import {
  DomainError,
  patchMemberSchema,
  patchStaffSchema,
  ownPreferencesSchema,
  type PatchMember,
  type PatchStaff,
} from "@78feet/domain";
import type { Database } from "@78feet/db/connection";
import { user, userProfileImage, box } from "@78feet/db/schema";
import { memberAuth, staffAuth } from "@78feet/db/auth-schema";
import { lockRows } from "./bookings.ts";

export function validateImage(data: Buffer, mimeType: string) {
  if (!data.length || data.length > 5 * 1024 * 1024)
    throw new DomainError(
      "FORBIDDEN",
      "La imagen debe ocupar entre 1 byte y 5 MB",
    );
  const valid =
    mimeType === "image/jpeg"
      ? data.length >= 3 &&
        data[0] === 255 &&
        data[1] === 216 &&
        data[2] === 255
      : mimeType === "image/png"
        ? data.length >= 8 &&
          data
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mimeType === "image/webp" &&
          data.length >= 12 &&
          data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP";
  if (!valid)
    throw new DomainError(
      "FORBIDDEN",
      "El contenido no coincide con el formato de imagen",
    );
}
export async function saveProfileImage(
  db: Database,
  id: string,
  data: Buffer,
  mimeType: string,
  now = new Date(),
) {
  validateImage(data, mimeType);
  await db
    .insert(userProfileImage)
    .values({ userId: id, data, mimeType, updatedAt: now })
    .onConflictDoUpdate({
      target: userProfileImage.userId,
      set: { data, mimeType, updatedAt: now },
    });
  return `/api/v1/profile-images/${id}?v=${now.getTime()}`;
}
export async function removeProfileImage(db: Database, id: string) {
  await db.delete(userProfileImage).where(eq(userProfileImage.userId, id));
}
export async function readProfileImage(
  db: Database,
  viewer: { id: string; role: string },
  id: string,
) {
  if (!["member", "coach", "admin"].includes(viewer.role))
    throw new DomainError("FORBIDDEN");
  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, id));
  if (!target) throw new MissingResource();
  if (viewer.id !== id && viewer.role === "member") {
    const allowed =
      target.role === "member"
        ? await db.execute(
            sql`SELECT 1 FROM booking mine JOIN booking theirs ON mine.instance_id=theirs.instance_id WHERE mine.user_id=${viewer.id}::uuid AND theirs.user_id=${id}::uuid AND mine.status='active' AND theirs.status='active' LIMIT 1`,
          )
        : await db.execute(
            sql`SELECT 1 FROM class_instance WHERE coach_id=${id}::uuid LIMIT 1`,
          );
    if (!allowed.rowCount) throw new DomainError("FORBIDDEN");
  }
  const [image] = await db
    .select()
    .from(userProfileImage)
    .where(eq(userProfileImage.userId, id));
  return image ?? null;
}
export async function updatePreferences(
  db: Database,
  id: string,
  input: Parameters<typeof ownPreferencesSchema.parse>[0],
  now = new Date(),
) {
  const values = ownPreferencesSchema.parse(input);
  const [updated] = await db
    .update(user)
    .set({ ...values, updatedAt: now })
    .where(eq(user.id, id))
    .returning({ theme: user.theme, preferenceBoxId: user.preferenceBoxId });
  if (!updated) throw new DomainError("FORBIDDEN");
  return updated;
}
export async function changePaymentBox(
  db: Database,
  id: string,
  boxId: string,
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await lockRows(tx, [], [id]);
    const [updated] = await tx
      .update(user)
      .set({ paymentBoxId: boxId, updatedAt: now })
      .where(and(eq(user.id, id), eq(user.role, "member")))
      .returning({ id: user.id, paymentBoxId: user.paymentBoxId });
    if (!updated) throw new DomainError("FORBIDDEN");
    return updated;
  });
}
export async function updateMember(
  db: Database,
  id: string,
  input: PatchMember,
  now = new Date(),
) {
  const values = patchMemberSchema.parse(input);
  if (values.dni) values.dni = values.dni.trim().toUpperCase();
  if (values.email === null)
    throw new DomainError("FORBIDDEN", "El correo es obligatorio");
  return db.transaction(async (tx) => {
    await lockRows(tx, [], [id]);
    const [existing] = await tx
      .select()
      .from(user)
      .where(and(eq(user.id, id), eq(user.role, "member")));
    if (!existing) throw new DomainError("FORBIDDEN");
    const { email, dni, ...contact } = values;
    if (dni && dni.includes("@")) throw new DomainError("FORBIDDEN");
    await tx
      .update(user)
      .set({ ...contact, dni, updatedAt: now })
      .where(eq(user.id, id));
    await tx
      .update(memberAuth.user)
      .set({
        email: email?.toLowerCase(),
        emailVerified: email ? false : undefined,
        username: dni?.toLowerCase(),
        displayUsername: dni,
        name: `${values.firstName ?? existing.firstName} ${values.lastName ?? existing.lastName}`,
        updatedAt: now,
      })
      .where(eq(memberAuth.user.id, existing.authUserId));
    return { id };
  });
}
export async function patchStaff(
  db: Database,
  id: string,
  input: PatchStaff,
  now = new Date(),
) {
  const values = patchStaffSchema.parse(input);
  if (values.email === null)
    throw new DomainError("FORBIDDEN", "El correo es obligatorio");
  const password = values.password
    ? await hashPassword(values.password)
    : undefined;
  return db.transaction(async (tx) => {
    await lockRows(tx, [], [id]);
    const [existing] = await tx.select().from(user).where(eq(user.id, id));
    if (!existing || existing.role === "member")
      throw new DomainError("FORBIDDEN");
    await tx
      .update(user)
      .set({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        status: values.status,
        updatedAt: now,
        ...(password ? { failedLogins: 0, lockedUntil: null } : {}),
      })
      .where(eq(user.id, id));
    await tx
      .update(staffAuth.user)
      .set({
        email: values.email?.toLowerCase(),
        emailVerified: values.email ? false : undefined,
        name: `${values.firstName ?? existing.firstName} ${values.lastName ?? existing.lastName}`,
        updatedAt: now,
      })
      .where(eq(staffAuth.user.id, existing.authUserId));
    if (password)
      await tx
        .update(staffAuth.account)
        .set({ password, updatedAt: now })
        .where(eq(staffAuth.account.userId, existing.authUserId));
    if (password || values.status === "inactive")
      await tx
        .delete(staffAuth.session)
        .where(eq(staffAuth.session.userId, existing.authUserId));
    return { id };
  });
}
