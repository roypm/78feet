import type { CreateStaff, PatchStaff } from "@78feet/domain";
import { hashPassword } from "../auth/password";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";

function staffView(user: {
  id: string;
  loginId: string;
  role: "coach" | "admin" | "member";
  status: "active" | "inactive";
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
}) {
  return {
    id: user.id,
    loginId: user.loginId,
    role: user.role === "admin" ? ("admin" as const) : ("coach" as const),
    status: user.status,
    firstName: user.firstName,
    lastName: user.lastName,
    dni: user.dni,
    phone: user.phone,
    email: user.email,
  };
}

export async function listStaff() {
  const rows = await prisma.user.findMany({
    where: { role: { in: ["coach", "admin"] } },
    select: {
      id: true,
      loginId: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
      email: true,
    },
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map(staffView);
}

export async function getStaff(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      loginId: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
      email: true,
    },
  });
  if (!user || (user.role !== "coach" && user.role !== "admin")) {
    throw new BoxError(404, "FORBIDDEN", "La cuenta de equipo no existe");
  }
  return staffView(user);
}

export async function listCoaches() {
  const rows = await prisma.user.findMany({
    where: { role: { in: ["coach", "admin"] }, status: "active" },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    role: row.role,
  }));
}

export async function createStaff(input: CreateStaff) {
  try {
    const user = await prisma.user.create({
      data: {
        loginId: input.loginId,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        status: "active",
        firstName: input.firstName,
        lastName: input.lastName,
        dni: input.dni,
        phone: input.phone ?? null,
        email: input.email ?? null,
      },
      select: {
        id: true,
        loginId: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        dni: true,
        phone: true,
        email: true,
      },
    });
    return staffView(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BoxError(409, "FORBIDDEN", "Ese usuario ya existe");
    }
    throw error;
  }
}

export async function patchStaff(id: string, patch: PatchStaff) {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing || (existing.role !== "coach" && existing.role !== "admin")) {
    throw new BoxError(404, "FORBIDDEN", "La cuenta de staff no existe");
  }
  const data: {
    status?: "active" | "inactive";
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    email?: string | null;
    passwordHash?: string;
    tokenVersion?: { increment: number };
  } = {
    firstName: patch.firstName,
    lastName: patch.lastName,
    phone: patch.phone,
    email: patch.email,
  };
  if (patch.status) {
    data.status = patch.status;
    if (patch.status === "inactive") data.tokenVersion = { increment: 1 };
  }
  if (patch.password) {
    data.passwordHash = await hashPassword(patch.password);
    data.tokenVersion = { increment: 1 };
  }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      loginId: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
      email: true,
    },
  });
  return staffView(user);
}
