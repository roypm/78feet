import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@78feet/domain"],
  serverExternalPackages: ["argon2", "@prisma/client"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
