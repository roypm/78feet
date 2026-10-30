import { unpaidQuerySchema } from "@78feet/domain";
import { listUnpaid } from "@/lib/box/unpaid";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const query = parseSchema(unpaidQuerySchema, date ? { date } : {});
  return listUnpaid(query.date);
});
