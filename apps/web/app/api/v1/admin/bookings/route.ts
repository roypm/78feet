import { createAdminBookingRequestSchema } from "@78feet/domain";
import { reserveForMember } from "@/lib/box/bookings";
import { readBody, staffHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const POST = staffHandler(
  ["coach", "admin"],
  async (user, request) => {
    const body = parseSchema(createAdminBookingRequestSchema, await readBody(request));
    return reserveForMember({
      memberId: body.userId,
      instanceId: body.instanceId,
      createdBy: user.id,
    });
  },
  201,
);
