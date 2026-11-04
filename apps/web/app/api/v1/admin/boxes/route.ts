import { createBoxSchema } from "@78feet/domain";
import { createBox, listBoxes } from "@/lib/box/boxes";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => listBoxes());

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createBox(parseSchema(createBoxSchema, await readBody(request))),
  201,
);
