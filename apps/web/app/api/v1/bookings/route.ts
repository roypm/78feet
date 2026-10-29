import { createBookingRequestSchema } from "@78feet/domain";
import { reserveForMember } from "@/lib/box/bookings";
import { readBody, sessionHandler } from "@/lib/box/guard";
import { parseSchema } from "@/lib/box/parse";

export const POST = sessionHandler(
  ["member"],
  async (user, request) => {
    const body = parseSchema(createBookingRequestSchema, await readBody(request));
    return reserveForMember({
      memberId: user.id,
      instanceId: body.instanceId,
      createdBy: user.id,
    });
  },
  201,
);
