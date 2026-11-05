import { pageNumber } from "@/lib/box/pagination";
import { listUpcomingBookingsPage } from "@/lib/box/bookings";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member"], async (user, request) => {
  const page = pageNumber(new URL(request.url).searchParams.get("pagina") ?? undefined);
  return listUpcomingBookingsPage(user.id, page);
});
