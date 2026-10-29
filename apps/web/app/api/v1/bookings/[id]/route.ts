import { cancelMemberBooking } from "@/lib/box/bookings";
import { BoxError } from "@/lib/box/errors";
import { sessionHandler } from "@/lib/box/guard";

export const DELETE = sessionHandler(["member"], async (user, _request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la reserva");
  return cancelMemberBooking(id, user.id);
});
