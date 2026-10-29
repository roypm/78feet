import { Prisma, type PrismaClient } from "@prisma/client";

export type Db = PrismaClient | Prisma.TransactionClient;

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
