import { adminWeekQuerySchema } from "@78feet/domain";
import { listBoxes, pickBox } from "@/lib/box/boxes";
import { listWeek } from "@/lib/box/staff-calendar";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (_user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(adminWeekQuerySchema, { from: url.searchParams.get("from") });
  const box = pickBox(await listBoxes(), url.searchParams.get("box") ?? undefined);
  return listWeek(query.from, new Date(), box.id);
});
