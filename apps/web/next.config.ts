import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@78feet/domain"],
  serverExternalPackages: ["argon2", "@prisma/client"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
