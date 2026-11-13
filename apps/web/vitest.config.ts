import path from "node:path";
import { defineConfig } from "vitest/config";

// Web tests exercise presentation only; PostgreSQL acceptance lives in API/application.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
