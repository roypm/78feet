import { trainingListQuerySchema } from "@78feet/domain";
import { listTrainingFilterTypes, listTrainings } from "@/lib/box/trainings";
import { parseSchema } from "@/lib/box/parse";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member", "coach", "admin"], async (_user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(trainingListQuerySchema, {
    classTypeId: url.searchParams.get("classTypeId") ?? undefined,
  });
  const [trainings, types] = await Promise.all([
    listTrainings(query.classTypeId),
    listTrainingFilterTypes(),
  ]);
  return { trainings, types };
});
