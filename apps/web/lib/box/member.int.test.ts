import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { localDateString, rosterName } from "@78feet/domain";
import { hashPassword } from "../auth/password";
import { signSessionToken } from "../auth/jwt";
import { POST as createMember } from "../../app/api/v1/admin/members/route";
import { GET as calendar } from "../../app/api/v1/calendar/route";
import { GET as instanceDetail } from "../../app/api/v1/instances/[id]/route";
import { GET as summary } from "../../app/api/v1/me/summary/route";
import { GET as myBookings } from "../../app/api/v1/me/bookings/route";
import { POST as book } from "../../app/api/v1/bookings/route";
import { isoDateToDb } from "./time";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("pantallas del socio", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const instanceIds: string[] = [];
  const classTypeIds: string[] = [];
  let tariffId = "";
  let adminToken = "";
  let coachToken = "";
  let memberId = "";
  let memberToken = "";

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
    const coach = await prisma.user.create({
      data: {
        loginId: `coach-${suffix}`,
        passwordHash,
        role: "coach",
        status: "active",
        firstName: "Ciro",
        lastName: "Coach",
      },
    });
    userIds.push(admin.id, coach.id);
    adminToken = await signSessionToken({ sub: admin.id, role: "admin", tv: 0 });
    coachToken = await signSessionToken({ sub: coach.id, role: "coach", tv: 0 });
    const tariff = await prisma.tariff.create({
      data: {
        name: `Mensual ${suffix}`,
        consumptionModel: "weekly_quota",
        billingPeriod: "monthly",
        priceCents: 7000,
        weeklyDirected: 2,
        weeklyOpen: 1,
      },
    });
    tariffId = tariff.id;
    const created = await call(createMember, "POST", "/api/v1/admin/members", adminToken, {
      dni: `nora-${suffix}`,
      password: "secret-pass",
      firstName: "Nora",
      lastName: "Norte",
      tariffId,
    });
    expect(created.status).toBe(201);
    memberId = (created.json as { id: string }).id;
    userIds.push(memberId);
    memberToken = await signSessionToken({ sub: memberId, role: "member", tv: 0 });
  });

  afterAll(async () => {
    const ids = [...new Set(userIds)];
    await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
    await prisma.classInstance.deleteMany({ where: { id: { in: instanceIds } } });
    if (classTypeIds.length) await prisma.classType.deleteMany({ where: { id: { in: classTypeIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
    await prisma.creditGrant.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { createdBy: { in: ids } }] },
    });
    await prisma.membership.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (tariffId) await prisma.tariff.deleteMany({ where: { id: tariffId } });
    await prisma.$disconnect();
  });

  async function call(
    handler: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
    method: string,
    path: string,
    token: string | null,
    body?: unknown,
    params?: Record<string, string>,
  ) {
    const request = new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const response = await handler(request, { params: Promise.resolve(params ?? {}) });
    const text = await response.text();
    return {
      status: response.status,
      json: (text ? JSON.parse(text) : null) as Record<string, unknown>,
    };
  }

  it("lists the week, the roster and the tariff for a member", async () => {
    const today = localDateString(new Date());
    const startAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const classType = await prisma.classType.create({
      data: { name: `WOD ${suffix}`, kind: "directed", imageKey: "placeholder.png" },
    });
    classTypeIds.push(classType.id);
    const row = await prisma.classInstance.create({
      data: {
        date: isoDateToDb(today),
        startAt,
        endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        classTypeId: classType.id,
        kind: "directed",
        capacity: 12,
        status: "scheduled",
      },
    });
    instanceIds.push(row.id);

    const denied = await call(
      calendar,
      "GET",
      `/api/v1/calendar?from=${today}&to=${today}`,
      coachToken,
    );
    expect(denied.status).toBe(403);

    const listed = await call(
      calendar,
      "GET",
      `/api/v1/calendar?from=${today}&to=${today}`,
      memberToken,
    );
    expect(listed.status).toBe(200);
    const classes = listed.json as unknown as { id: string; name: string; freeSpots: number; bookedByMe: boolean }[];
    const found = classes.find((item) => item.id === row.id);
    expect(found).toMatchObject({ name: `WOD ${suffix}`, freeSpots: 12, bookedByMe: false });

    const before = await call(summary, "GET", "/api/v1/me/summary", memberToken);
    expect(before.status).toBe(200);
    expect(before.json).toMatchObject({
      tariff: { consumptionModel: "weekly_quota", billingPeriod: "monthly", priceCents: 7000 },
      payment: { status: "pending" },
      quota: { directedLimit: 2, openLimit: 1, packBalance: 0 },
    });

    const reserved = await call(book, "POST", "/api/v1/bookings", memberToken, { instanceId: row.id });
    expect(reserved.status).toBe(201);

    const detail = await call(instanceDetail, "GET", `/api/v1/instances/${row.id}`, memberToken, undefined, {
      id: row.id,
    });
    expect(detail.status).toBe(200);
    expect(detail.json).toMatchObject({
      bookedCount: 1,
      freeSpots: 11,
      bookedByMe: true,
      canBook: false,
      roster: [rosterName("Nora", "Norte")],
    });
    expect(JSON.stringify(detail.json)).not.toContain("nora-");

    const after = await call(summary, "GET", "/api/v1/me/summary", memberToken);
    expect(after.json).toMatchObject({ quota: { directedUsed: 1 } });

    const mine = await call(myBookings, "GET", "/api/v1/me/bookings", memberToken);
    const bookings = mine.json as unknown as { instanceId: string; canCancel: boolean }[];
    expect(bookings.some((item) => item.instanceId === row.id && item.canCancel)).toBe(true);

    const admin = await prisma.user.findFirstOrThrow({ where: { loginId: `admin-${suffix}` } });
    await prisma.payment.create({
      data: {
        userId: memberId,
        billingPeriod: "monthly",
        periodStart: isoDateToDb(`${today.slice(0, 7)}-01`),
        amountCents: 7000,
        recordedBy: admin.id,
      },
    });
    const paid = await call(summary, "GET", "/api/v1/me/summary", memberToken);
    expect(paid.json).toMatchObject({ payment: { status: "paid" } });
  });
});
