import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@78feet/domain"],
  serverExternalPackages: ["argon2", "@prisma/client"],
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      { source: "/staff/reservas", destination: "/staff/semana", permanent: false },
      { source: "/staff/socios/nuevo", destination: "/staff/socios", permanent: false },
    ];
  },
};

export default nextConfig;
