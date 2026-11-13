import assert from "node:assert/strict";
import { nextRun, runWithRetry } from "./worker.ts";
import type { Database } from "@78feet/db/connection";
assert.equal(
  nextRun(new Date("2026-10-24T04:00:00Z")).toISOString(),
  "2026-10-25T02:15:00.000Z",
);
assert.equal(
  nextRun(new Date("2027-03-27T04:00:00Z")).toISOString(),
  "2027-03-28T01:15:00.000Z",
);
assert.equal(
  nextRun(new Date("2026-11-13T02:15:00Z")).toISOString(),
  "2026-11-14T02:15:00.000Z",
);
let attempts = 0;
const waits: number[] = [];
await assert.rejects(
  runWithRetry({} as Database, new AbortController().signal, {
    run: async () => {
      attempts++;
      throw new Error("offline");
    },
    sleep: async (ms) => {
      waits.push(ms);
    },
  }),
);
assert.equal(attempts, 3);
assert.deepEqual(waits, [1000, 2000]);
const aborted = new AbortController();
aborted.abort();
await assert.rejects(runWithRetry({} as Database, aborted.signal));
console.log(
  "PASS worker: Madrid daily schedule across DST, bounded retries, cancellation",
);
