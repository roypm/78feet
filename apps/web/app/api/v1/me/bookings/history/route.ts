import { listBookingHistory } from "@/lib/box/bookings";
import { sessionHandler } from "@/lib/box/guard";

export const GET = sessionHandler(["member"], async (user) => listBookingHistory(user.id));
