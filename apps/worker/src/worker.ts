import { atBoxTime, addDays, localDateString } from "@78feet/domain";
import { materializeHorizon } from "@78feet/application/schedule";
import type { Database } from "@78feet/db/connection";
import { setTimeout as delay } from "node:timers/promises";
export function nextRun(now: Date) {
  const today = localDateString(now);
  const at = atBoxTime(today, "03:15");
  return at > now ? at : atBoxTime(addDays(today, 1), "03:15");
}
export async function runWithRetry(
  db: Database,
  signal: AbortSignal,
  options: {
    sleep?: (ms: number) => Promise<void>;
    run?: typeof materializeHorizon;
  } = {},
) {
  const sleep = options.sleep ?? ((ms) => delay(ms, undefined, { signal }));
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    try {
      return await (options.run ?? materializeHorizon)(db);
    } catch (error) {
      if (attempt === 2) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error("Retry budget exhausted");
}
