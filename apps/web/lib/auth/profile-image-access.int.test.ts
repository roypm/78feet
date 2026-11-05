import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET as profileImage } from "../../app/api/v1/profile-images/[userId]/route";
import { POST as book } from "../../app/api/v1/bookings/route";
import { POST as createMember } from "../../app/api/v1/admin/members/route";
import { hashPassword } from "../auth/password";
import { signSessionToken } from "../auth/jwt";
import { isoDateToDb } from "../box/time";
import { primaryBoxId } from "../box/hours";
import { callRoute } from "../test/call-route";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("profile image access", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  let classTypeId = "";
  let instanceId = "";
  let adminToken = "";
  let memberAToken = "";
  let memberBId = "";
  let memberBToken = "";
  let tariffId = "";

  beforeAll(async () => {
    const passwordHash = await hashPassword("secret-pass");
    const admin = await prisma.user.create({
      data: {
        loginId: `admin-${suffix}`,
        passwordHash,
        role: "admin",
        status: "active",
        firstName: "Ada",
        lastName: "Admin",
      },
    });
    userIds.push(admin.id);
    adminToken = await signSessionToken({ sub: admin.id, role: "admin", tv: 0 });
    const tariff = await prisma.tariff.create({
      data: {
        name: `T ${suffix}`,
        consumptionModel: "weekly_quota",
        billingPeriod: "monthly",
        priceCents: 7000,
        quotaDirected: 4,
        quotaOpen: 2,
      },
    });
    tariffId = tariff.id;

    const createdA = await callRoute(createMember, "POST", "/api/v1/admin/members", {
      token: adminToken,
      body: {
        dni: `a-${suffix}`,
        password: "secret-pass",
        firstName: "Ana",
        lastName: "Alfa",
        tariffId,
      },
    });
    expect(createdA.status).toBe(201);
    const memberAId = (createdA.json as { id: string }).id;
    userIds.push(memberAId);
    memberAToken = await signSessionToken({ sub: memberAId, role: "member", tv: 0 });

    const createdB = await callRoute(createMember, "POST", "/api/v1/admin/members", {
      token: adminToken,
      body: {
        dni: `b-${suffix}`,
        password: "secret-pass",
        firstName: "Bea",
        lastName: "Beta",
        tariffId,
      },
    });
    expect(createdB.status).toBe(201);
    memberBId = (createdB.json as { id: string }).id;
    userIds.push(memberBId);
    memberBToken = await signSessionToken({ sub: memberBId, role: "member", tv: 0 });

    await prisma.userProfileImage.create({
      data: {
        userId: memberBId,
        mimeType: "image/png",
        data: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64",
        ),
      },
    });

    const classType = await prisma.classType.create({
      data: { name: `WOD ${suffix}`, kind: "directed", imageKey: "placeholder.png" },
    });
    classTypeId = classType.id;
    const today = new Date();
    const startAt = new Date(today.getTime() + 4 * 60 * 60 * 1000);
    const row = await prisma.classInstance.create({
      data: {
        boxId: await primaryBoxId(prisma),
        date: isoDateToDb(today.toISOString().slice(0, 10)),
        startAt,
        endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        classTypeId: classType.id,
        kind: "directed",
        capacity: 10,
        status: "scheduled",
      },
    });
    instanceId = row.id;

    const reserved = await callRoute(book, "POST", "/api/v1/bookings", {
      token: memberAToken,
      body: { instanceId },
    });
    expect(reserved.status).toBe(201);
  });

  afterAll(async () => {
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userProfileImage.deleteMany({ where: { userId: { in: userIds } } });
    if (instanceId) await prisma.classInstance.deleteMany({ where: { id: instanceId } });
    if (classTypeId) await prisma.classType.deleteMany({ where: { id: classTypeId } });
    if (tariffId) await prisma.tariff.deleteMany({ where: { id: tariffId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("denies a member who is not on the same class roster", async () => {
    const denied = await callRoute(
      profileImage as (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
      "GET",
      `/api/v1/profile-images/${memberBId}`,
      {
        token: memberAToken,
        params: { userId: memberBId },
      },
    );
    expect(denied.status).toBe(404);
  });

  it("allows the photo once both members share an active booking on one class", async () => {
    const booked = await callRoute(book, "POST", "/api/v1/bookings", {
      token: memberBToken,
      body: { instanceId },
    });
    expect(booked.status).toBe(201);

    const allowed = await callRoute(
      profileImage as (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
      "GET",
      `/api/v1/profile-images/${memberBId}`,
      {
        token: memberAToken,
        params: { userId: memberBId },
      },
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("content-type")).toBe("image/png");
    expect(allowed.json).toBeNull();
  });
});
