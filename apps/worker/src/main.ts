import { connect } from "@78feet/db/connection";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { nextRun, runWithRetry } from "./worker.ts";
const connection = connect(process.env.DATABASE_URL!);
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => controller.abort());
const once = process.argv.includes("--once");
try {
  while (!controller.signal.aborted) {
    const lease = await connection.pool.connect();
    let leader = false;
    const lost = () => controller.abort();
    lease.once("error", lost);
    try {
      leader = (
        await lease.query("SELECT pg_try_advisory_lock(78,40) AS leader")
      ).rows[0].leader;
      if (!leader) {
        await writeFile("/tmp/78feet-worker-ready", String(Date.now()));
        if (once) break;
        await delay(30_000, undefined, { signal: controller.signal });
        continue;
      }
      do {
        try {
          const result = await runWithRetry(connection.db, controller.signal);
          process.stdout.write(
            JSON.stringify({ event: "materialized", ...result }) + "\n",
          );
          await writeFile("/tmp/78feet-worker-ready", String(Date.now()));
        } catch (error) {
          if (controller.signal.aborted) break;
          process.stderr.write(
            JSON.stringify({
              event: "materialization-failed",
              code: error instanceof Error ? error.name : "Error",
            }) + "\n",
          );
          if (once) throw error;
          await delay(30_000, undefined, { signal: controller.signal });
          continue;
        }
        if (once) break;
        await delay(
          Math.max(1, nextRun(new Date()).getTime() - Date.now()),
          undefined,
          { signal: controller.signal },
        );
      } while (!controller.signal.aborted);
    } finally {
      lease.removeListener("error", lost);
      if (leader)
        await lease.query("SELECT pg_advisory_unlock(78,40)").catch(() => {});
      lease.release();
    }
    if (once) break;
  }
} catch (error) {
  if (!controller.signal.aborted) throw error;
} finally {
  await connection.close();
}
