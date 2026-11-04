import { boxHoursConfigSchema } from "@78feet/domain";
import { getBoxHours, updateBoxHours } from "@/lib/box/hours";
import { requireBox } from "@/lib/box/boxes";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

function boxQuery(request: Request): string | undefined {
  const box = new URL(request.url).searchParams.get("box");
  return box && box.length > 0 ? box : undefined;
}

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const boxId = boxQuery(request);
  if (boxId) await requireBox(boxId);
  return getBoxHours(undefined, boxId);
});

export const PATCH = staffHandler(["admin"], async (_user, request) => {
  const boxId = boxQuery(request);
  if (boxId) await requireBox(boxId);
  return updateBoxHours(parseSchema(boxHoursConfigSchema, await readBody(request)), new Date(), boxId);
});
