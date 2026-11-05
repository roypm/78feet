import { adminDayQuerySchema } from "@78feet/domain";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { listDay } from "@/lib/box/staff-calendar";
import { parseSchema } from "@/lib/box/parse";
import { staffHandler } from "@/lib/box/guard";

export const GET = staffHandler(["coach", "admin"], async (user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(adminDayQuerySchema, { date: url.searchParams.get("date") });
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const box = pickBox(boxes, url.searchParams.get("box") ?? undefined, user.preferenceBoxId);
  return listDay(query.date, new Date(), box.id);
});
