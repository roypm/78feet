import { listUpcomingBookings } from "@/lib/box/bookings";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member"], async (user) => listUpcomingBookings(user.id));
