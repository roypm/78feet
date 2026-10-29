import { adminDayQuerySchema } from "@78feet/domain";
import { listDay } from "@/lib/box/staff-calendar";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const date = new URL(request.url).searchParams.get("date");
  const query = parseSchema(adminDayQuerySchema, { date });
  return listDay(query.date);
});
