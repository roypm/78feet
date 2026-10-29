import { changeTariffSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { changeMemberTariff } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["coach", "admin"], async (user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  const body = parseSchema(changeTariffSchema, await readBody(request));
  return changeMemberTariff(id, body.tariffId, user.id);
});
