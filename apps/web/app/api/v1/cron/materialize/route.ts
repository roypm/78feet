import { timingSafeEqual } from "node:crypto";
import { errorResponse } from "@/lib/box/errors";
import { materializeHorizon } from "@/lib/box/materialize";
import { jsonError, jsonOk } from "@/lib/http";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  const left = Buffer.from(bearer);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function materialize(request: Request): Promise<Response> {
  if (!authorized(request)) return jsonError("FORBIDDEN", 401);
  try {
    return jsonOk(await materializeHorizon());
  } catch (error) {
    const response = errorResponse(error);
    if (response) return response;
    throw error;
  }
}

export function GET(request: Request): Promise<Response> {
  return materialize(request);
}

export function POST(request: Request): Promise<Response> {
  return materialize(request);
}
