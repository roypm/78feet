import { calendarQuerySchema } from "@78feet/domain";
import { listCalendar } from "@/lib/box/calendar";
import { listBoxes, orderBoxes, pickBox } from "@/lib/box/boxes";
import { sessionHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const GET = sessionHandler(["member"], async (user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(calendarQuerySchema, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  const boxes = orderBoxes(await listBoxes(), user.preferenceBoxId);
  const box = pickBox(boxes, url.searchParams.get("box") ?? undefined, user.preferenceBoxId);
  return listCalendar(user.id, query.from, query.to, new Date(), box.id);
});
