import { cancelAdminBookingQuerySchema } from "@78feet/domain";
import { cancelStaffBooking } from "@/lib/box/bookings";
import { BoxError } from "@/lib/box/errors";
import { staffHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const DELETE = staffHandler(["coach", "admin"], async (user, request, params) => {
  const id = params.id;
  if (!id) throw new BoxError(400, "FORBIDDEN", "Falta la reserva");
  const raw = new URL(request.url).searchParams.get("returnQuota");
  const query = parseSchema(cancelAdminBookingQuerySchema, raw ? { returnQuota: raw } : {});
  const returnQuota = query.returnQuota !== "false";
  return cancelStaffBooking(id, user.id, returnQuota);
});
