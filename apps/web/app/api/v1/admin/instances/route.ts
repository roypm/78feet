import { createInstanceSchema } from "@78feet/domain";
import { createExtraInstance } from "@/lib/box/instances";
import { parseSchema } from "@/lib/box/parse";
import { readBody, staffHandler } from "@/lib/box/guard";

export const POST = staffHandler(
  ["coach", "admin"],
  async (_user, request) => createExtraInstance(parseSchema(createInstanceSchema, await readBody(request))),
  201,
);
