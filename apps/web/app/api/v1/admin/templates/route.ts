import { templateWriteSchema } from "@78feet/domain";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { parseSchema } from "@/lib/box/parse";
import { createTemplate, listTemplates } from "@/lib/box/templates";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (user, request) => {
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const box = pickBox(boxes, new URL(request.url).searchParams.get("box") ?? undefined, user.preferenceBoxId);
  return listTemplates(box.id);
});

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createTemplate(parseSchema(templateWriteSchema, await readBody(request))),
  201,
);
