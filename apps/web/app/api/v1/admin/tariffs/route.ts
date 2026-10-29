import { tariffWriteSchema } from "@78feet/domain";
import { parseSchema } from "@/lib/box/parse";
import { createTariff, listTariffs } from "@/lib/box/tariffs";
import { readBody, staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async () => listTariffs());

export const POST = staffHandler(
  ["admin"],
  async (_user, request) => createTariff(parseSchema(tariffWriteSchema, await readBody(request))),
  201,
);
