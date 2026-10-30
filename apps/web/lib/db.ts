import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Tras `prisma generate`, el dev server puede seguir con un client viejo en globalThis. */
function prismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && typeof cached.weeklyQuotaAdjustment?.findMany === "function") {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => {});
  }
  const next = new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = next;
  }
  return next;
}

export const prisma = prismaClient();
