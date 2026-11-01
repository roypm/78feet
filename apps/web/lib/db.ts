import { Prisma, PrismaClient } from "@prisma/client";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaSchemaKey?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function prismaSchemaKey(): string {
  return Prisma.dmmf.datamodel.models
    .map((model) => `${model.name}:${model.fields.map((field) => field.name).join(",")}`)
    .join(";");
}

/** Tras `prisma generate` o migraciones, el dev server puede seguir con un client viejo en globalThis. */
function prismaClient(): PrismaClient {
  const schemaKey = prismaSchemaKey();
  if (globalForPrisma.prisma && globalForPrisma.prismaSchemaKey === schemaKey) {
    return globalForPrisma.prisma;
  }
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  const next = new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = next;
    globalForPrisma.prismaSchemaKey = schemaKey;
  }
  return next;
}

export const prisma = prismaClient();
