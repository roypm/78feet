import { connect } from "@78feet/db/connection";
import { buildApi } from "./server.ts";
const connection = connect(process.env.DATABASE_URL!);
const app = await buildApi({
  db: connection.db,
  close: connection.close,
  logger: true,
  auth: {
    origin: process.env.PUBLIC_ORIGIN!,
    memberSecret: process.env.MEMBER_AUTH_SECRET!,
    staffSecret: process.env.STAFF_AUTH_SECRET!,
    nativeOrigins: (process.env.NATIVE_ORIGINS ?? "")
      .split(",")
      .filter(Boolean),
  },
});
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    void app.close();
  });
await app.listen({
  host: process.env.API_HOST ?? "0.0.0.0",
  port: Number(process.env.API_PORT ?? 3001),
});
