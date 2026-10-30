import { weeklyQuotaAdjustmentSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { adjustMemberWeeklyQuota } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["coach", "admin"], async (user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  return adjustMemberWeeklyQuota(id, parseSchema(weeklyQuotaAdjustmentSchema, await readBody(request)), user.id);
}, 201);
