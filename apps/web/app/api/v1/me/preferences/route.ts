import { ownPreferencesSchema } from "@78feet/domain";
import { prisma } from "@/lib/db";
import { requireBox } from "@/lib/box/boxes";
import { BoxError } from "@/lib/box/errors";
import { readBody, sessionHandler } from "@/lib/box/guard";

const roles = ["member", "coach", "admin"] as const;

export const GET = sessionHandler(roles, async (user) => ({
  theme: user.theme,
  preferenceBoxId: user.preferenceBoxId,
}));

export const PATCH = sessionHandler(roles, async (user, request) => {
  const parsed = ownPreferencesSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new BoxError(400, "FORBIDDEN", "Preferencia no válida");
  const data: { theme?: typeof user.theme; preferenceBoxId?: string | null } = {};
  if (parsed.data.theme !== undefined) data.theme = parsed.data.theme;
  if (parsed.data.preferenceBoxId !== undefined) {
    if (parsed.data.preferenceBoxId !== null) await requireBox(parsed.data.preferenceBoxId);
    data.preferenceBoxId = parsed.data.preferenceBoxId;
  }
  return prisma.user.update({
    where: { id: user.id },
    data,
    select: { theme: true, preferenceBoxId: true },
  });
});
