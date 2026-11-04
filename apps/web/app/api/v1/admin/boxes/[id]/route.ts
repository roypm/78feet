import { createBoxSchema } from "@78feet/domain";
import { renameBox } from "@/lib/box/boxes";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const PATCH = staffHandler(["admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el box");
  return renameBox(id, parseSchema(createBoxSchema, await readBody(request)));
});
