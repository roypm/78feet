import { pageNumber } from "@/lib/box/pagination";
import { trainingListQuerySchema } from "@78feet/domain";
import { listTrainingFilterTypes, listTrainings, listTrainingsPage } from "@/lib/box/trainings";
import { parseSchema } from "@/lib/box/parse";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member", "coach", "admin"], async (_user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(trainingListQuerySchema, {
    classTypeId: url.searchParams.get("classTypeId") ?? undefined,
  });
  if (url.searchParams.has("page")) {
    const [result, types] = await Promise.all([
      listTrainingsPage(query.classTypeId, pageNumber(url.searchParams.get("page") ?? undefined)),
      listTrainingFilterTypes(),
    ]);
    return { ...result, types };
  }
  const [trainings, types] = await Promise.all([
    listTrainings(query.classTypeId),
    listTrainingFilterTypes(),
  ]);
  return { trainings, types };
});
