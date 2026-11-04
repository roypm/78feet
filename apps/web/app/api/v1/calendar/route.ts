import { calendarQuerySchema } from "@78feet/domain";
import { listCalendar } from "@/lib/box/calendar";
import { listBoxes, memberBoxes, pickBox, rememberPreference } from "@/lib/box/boxes";
import { sessionHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const GET = sessionHandler(["member"], async (user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(calendarQuerySchema, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  const boxes = await listBoxes();
  const prefs = await memberBoxes(user.id);
  const requested = url.searchParams.get("box") ?? undefined;
  const chosen = requested ? boxes.find((box) => box.id === requested) : undefined;
  const preferred = boxes.find((box) => box.id === prefs.preferenceBoxId);
  const box = chosen ?? preferred ?? pickBox(boxes, undefined);
  if (chosen && chosen.id !== prefs.preferenceBoxId) await rememberPreference(user.id, chosen.id);
  return listCalendar(user.id, query.from, query.to, new Date(), box.id);
});
