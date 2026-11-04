import { templateWriteSchema } from "@78feet/domain";
import { listBoxes, pickBox } from "@/lib/box/boxes";
import { parseSchema } from "@/lib/box/parse";
import { createTemplate, listTemplates } from "@/lib/box/templates";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const box = pickBox(await listBoxes(), new URL(request.url).searchParams.get("box") ?? undefined);
  return listTemplates(box.id);
});

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createTemplate(parseSchema(templateWriteSchema, await readBody(request))),
  201,
);
