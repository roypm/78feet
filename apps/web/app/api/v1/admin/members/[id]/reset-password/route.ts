import { resetPasswordSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { resetMemberPassword } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["coach", "admin"], async (_user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  const body = parseSchema(resetPasswordSchema, await readBody(request));
  return resetMemberPassword(id, body.password);
});
