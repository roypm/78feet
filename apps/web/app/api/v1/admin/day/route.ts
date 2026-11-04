import { adminDayQuerySchema } from "@78feet/domain";
import { listBoxes, pickBox } from "@/lib/box/boxes";
import { listDay } from "@/lib/box/staff-calendar";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(adminDayQuerySchema, { date: url.searchParams.get("date") });
  const box = pickBox(await listBoxes(), url.searchParams.get("box") ?? undefined);
  return listDay(query.date, new Date(), box.id);
});
