import { getTraining } from "@/lib/box/trainings";
import { BoxError } from "@/lib/box/errors";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member", "coach", "admin"], async (_user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el entrenamiento");
  return getTraining(id);
});
