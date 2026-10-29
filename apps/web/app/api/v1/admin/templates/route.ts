import { templateWriteSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { createTemplate, listTemplates } from "@/lib/box/templates";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => listTemplates());

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createTemplate(parseSchema(templateWriteSchema, await readBody(request))),
  201,
);
