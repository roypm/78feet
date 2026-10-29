import { adminWeekQuerySchema } from "@78feet/domain";
import { listWeek } from "@/lib/box/staff-calendar";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const from = new URL(request.url).searchParams.get("from");
  const query = parseSchema(adminWeekQuerySchema, { from });
  return listWeek(query.from);
});
