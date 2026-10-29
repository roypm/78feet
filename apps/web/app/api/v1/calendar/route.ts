import { calendarQuerySchema } from "@78feet/domain";
import { listCalendar } from "@/lib/box/calendar";
import { sessionHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const GET = sessionHandler(["member"], async (user, request) => {
  const url = new URL(request.url);
  const query = parseSchema(calendarQuerySchema, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  return listCalendar(user.id, query.from, query.to);
});
