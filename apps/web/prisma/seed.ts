import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), "../../.env.local") });

const prisma = new PrismaClient();

async function main() {
  const loginId = process.env.ADMIN_LOGIN_ID ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD es obligatorio para el seed");
  }

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) {
    return;
  }

  await prisma.user.create({
    data: {
      loginId,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: "admin",
      status: "active",
      firstName: "Admin",
      lastName: "Box",
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
