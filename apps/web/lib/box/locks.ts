import type { Db } from "./db";
import { BoxError } from "./errors";

export async function lockUserRow(tx: Db, userId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "user" WHERE id = ${userId}::uuid FOR UPDATE
  `;
  if (rows.length === 0) throw new BoxError(404, "FORBIDDEN", "El usuario no existe");
}

export async function lockBoxRow(tx: Db, boxId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "box" WHERE id = ${boxId}::uuid FOR UPDATE
  `;
  if (rows.length === 0) throw new BoxError(404, "FORBIDDEN", "El box no existe");
}

export async function lockInstanceRow(tx: Db, instanceId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "class_instance" WHERE id = ${instanceId}::uuid FOR UPDATE
  `;
  if (rows.length === 0) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
}
