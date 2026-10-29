import { deactivateMember } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["admin"], async (user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  return deactivateMember(id, user.id);
});
