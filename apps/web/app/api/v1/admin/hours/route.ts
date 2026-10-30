import { boxHoursConfigSchema } from "@78feet/domain";
import { getBoxHours, updateBoxHours } from "@/lib/box/hours";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => getBoxHours());

export const PATCH = staffHandler(["admin"], async (_user, request) =>
  updateBoxHours(parseSchema(boxHoursConfigSchema, await readBody(request))),
);
