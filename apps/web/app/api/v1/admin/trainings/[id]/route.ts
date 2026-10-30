import { trainingPatchSchema } from "@78feet/domain";
import { deleteTraining, getTraining, updateTraining } from "@/lib/box/trainings";
import { BoxError } from "@/lib/box/errors";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

function requireId(params: Record<string, string>): string {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta el entrenamiento");
  return id;
}

export const GET = staffHandler(["coach", "admin"], async (_user, _request, params) =>
  getTraining(requireId(params), { includeAssignmentInfo: true }),
);

export const PATCH = staffHandler(["coach", "admin"], async (_user, request, params) =>
  updateTraining(requireId(params), parseSchema(trainingPatchSchema, await readBody(request))),
);

export const DELETE = staffHandler(["coach", "admin"], async (_user, request, params) => {
  const confirm = new URL(request.url).searchParams.get("confirmDetach") === "true";
  let confirmDetach = confirm;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await readBody(request)) as { confirmDetach?: boolean };
    if (body.confirmDetach === true) confirmDetach = true;
  }
  return deleteTraining(requireId(params), confirmDetach);
});
