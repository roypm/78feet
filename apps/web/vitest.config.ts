import path from "node:path";
import { defineConfig } from "vitest/config";

// Never load development env files into tests (they may reference remote data).
const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (!["localhost", "127.0.0.1", "db-test"].includes(url.hostname) || url.pathname !== "/feet_test") {
    throw new Error("TEST_DATABASE_URL must target local feet_test");
  }
}
process.env.DATABASE_URL = testUrl ?? "";
process.env.DIRECT_URL = testUrl ?? "";
process.env.JWT_SECRET = "local_test_only_jwt_secret";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "prisma/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
