import { patchTariffSchema } from "@78feet/domain";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { updateTariff } from "@/lib/box/tariffs";
import { readBody, staffHandler } from "@/lib/box/guard";

export const PATCH = staffHandler(["admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la tarifa");
  return updateTariff(id, parseSchema(patchTariffSchema, await readBody(request)));
});
