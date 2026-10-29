import { BOX_TIME_ZONE } from "@78feet/domain";

export function GET() {
  return Response.json({ ok: true, timeZone: BOX_TIME_ZONE });
}
