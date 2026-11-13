import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": root } },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: { "/api": { target: api, changeOrigin: true } },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: { "/api": { target: api, changeOrigin: true } },
  },
});
