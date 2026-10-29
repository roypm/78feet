import { getInstanceDetail } from "@/lib/box/calendar";
import { BoxError } from "@/lib/box/errors";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member"], async (user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la clase");
  return getInstanceDetail(user.id, id);
});
