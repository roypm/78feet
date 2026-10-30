import { trainingWriteSchema } from "@78feet/domain";
import { createTraining, listStaffTrainings } from "@/lib/box/trainings";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const classTypeId = new URL(request.url).searchParams.get("classTypeId") ?? undefined;
  return listStaffTrainings(classTypeId);
});

export const POST = staffHandler(
  ["coach", "admin"],
  async (_user, request) => createTraining(parseSchema(trainingWriteSchema, await readBody(request))),
  201,
);
