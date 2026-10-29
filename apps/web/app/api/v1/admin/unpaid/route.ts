import { unpaidQuerySchema } from "@78feet/domain";
import { listUnpaid } from "@/lib/box/unpaid";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  const query = parseSchema(unpaidQuerySchema, month ? { month } : {});
  return listUnpaid(query.month);
});
