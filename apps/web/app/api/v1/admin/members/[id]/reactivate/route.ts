import { reactivateMember } from "@/lib/box/members";
import { BoxError } from "@/lib/box/errors";
import { staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(["admin"], async (_user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el socio");
  return reactivateMember(id);
});
