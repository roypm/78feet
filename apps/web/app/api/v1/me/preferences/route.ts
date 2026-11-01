import { ownPreferencesSchema } from "@78feet/domain";
import { prisma } from "@/lib/db";
import { BoxError } from "@/lib/box/errors";
import { readBody, sessionHandler } from "@/lib/box/guard";

const roles = ["member", "coach", "admin"] as const;

export const GET = sessionHandler(roles, async (user) => ({ theme: user.theme }));

export const PATCH = sessionHandler(roles, async (user, request) => {
  const parsed = ownPreferencesSchema.safeParse(await readBody(request));
  if (!parsed.success) throw new BoxError(400, "FORBIDDEN", "Elegí un modo de apariencia válido");
  return prisma.user.update({
    where: { id: user.id },
    data: { theme: parsed.data.theme },
    select: { theme: true },
  });
});
