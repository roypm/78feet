import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/password";
import { signSessionToken } from "../auth/jwt";
import { GET as listHours, PATCH as patchHours } from "../../app/api/v1/admin/hours/route";
import { GET as listTypes, POST as createType } from "../../app/api/v1/admin/class-types/route";
import { POST as createTraining } from "../../app/api/v1/admin/trainings/route";
import { DELETE as deleteTraining } from "../../app/api/v1/admin/trainings/[id]/route";
import { GET as unpaid } from "../../app/api/v1/admin/unpaid/route";
import { POST as pay } from "../../app/api/v1/admin/payments/route";
import { POST as createMember } from "../../app/api/v1/admin/members/route";
import type { BoxHoursConfig } from "@78feet/domain";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!hasDatabase)("panel de staff", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const classTypeIds: string[] = [];
  const trainingIds: string[] = [];
  let tariffId = "";
  let adminToken = "";
  let coachToken = "";
  let previousHours: BoxHoursConfig | null = null;

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
        weeklyOpen: 0,
      },
    });
    tariffId = tariff.id;
  });

  afterAll(async () => {
    if (previousHours) {
      await prisma.boxSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          weeklyHours: previousHours.weekly,
          exceptions: previousHours.exceptions,
        },
        update: {
          weeklyHours: previousHours.weekly,
          exceptions: previousHours.exceptions,
        },
      });
    }
    const ids = [...new Set(userIds)];
    await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
    if (trainingIds.length) await prisma.training.deleteMany({ where: { id: { in: trainingIds } } });
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
    handler: (request: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
    method: string,
    path: string,
    token: string,
    body?: unknown,
    params?: Record<string, string>,
  ) {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const request = new Request(`http://localhost${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined || isForm ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    const response = await handler(request, params ? { params: Promise.resolve(params) } : undefined);
    return { status: response.status, json: (await response.json()) as Record<string, unknown> };
  }

  it("lets the admin set box hours and blocks a coach", async () => {
    const listed = await call(listHours, "GET", "/api/v1/admin/hours", coachToken);
    expect(listed.status).toBe(200);
    previousHours = listed.json as BoxHoursConfig;
    const updatedConfig: BoxHoursConfig = {
      weekly: previousHours.weekly.map((day) => ({
        ...day,
        intervals: [{ openTime: "06:00", closeTime: "22:00" }],
      })),
      exceptions: previousHours.exceptions,
    };

    const denied = await call(patchHours, "PATCH", "/api/v1/admin/hours", coachToken, updatedConfig);
    expect(denied.status).toBe(403);

    const updated = await call(patchHours, "PATCH", "/api/v1/admin/hours", adminToken, updatedConfig);
    expect(updated.status).toBe(200);
    expect(updated.json).toMatchObject({
      weekly: expect.arrayContaining([
        { weekday: 1, intervals: [{ openTime: "06:00", closeTime: "22:00" }] },
        { weekday: 7, intervals: [{ openTime: "06:00", closeTime: "22:00" }] },
      ]),
    });
  });

  it("stores a class type with an image and a training of that type", async () => {
    const denied = await call(createType, "POST", "/api/v1/admin/class-types", coachToken, new FormData());
    expect(denied.status).toBe(403);

    const form = new FormData();
    form.set("name", `Endurance ${suffix}`);
    form.set("kind", "directed");
    form.set("image", new File([png], "tipo.png", { type: "image/png" }));
    const created = await call(createType, "POST", "/api/v1/admin/class-types", adminToken, form);
    expect(created.status).toBe(201);
    const typeId = (created.json as { id: string; imageUrl: string }).id;
    classTypeIds.push(typeId);
    expect((created.json as { imageUrl: string }).imageUrl).toContain("/api/v1/class-type-images/db_");

    const listed = await call(listTypes, "GET", "/api/v1/admin/class-types", coachToken);
    expect(listed.status).toBe(200);

    const training = await call(createTraining, "POST", "/api/v1/admin/trainings", coachToken, {
      name: `Fuerza ${suffix}`,
      classTypeId: typeId,
      phases: [{ name: "WOD", blocks: [{ body: "AMRAP 12" }] }],
    });
    expect(training.status).toBe(201);
    const trainingId = (training.json as { id: string }).id;
    trainingIds.push(trainingId);

    const removed = await call(
      deleteTraining,
      "DELETE",
      `/api/v1/admin/trainings/${trainingId}`,
      coachToken,
      undefined,
      { id: trainingId },
    );
    expect(removed.status).toBe(200);
  });

  it("lists unpaid monthly members and records the month payment", async () => {
    const member = await call(createMember, "POST", "/api/v1/admin/members", coachToken, {
      dni: `impago-${suffix}`,
      password: "secret-pass",
      firstName: "Inés",
      lastName: "Impago",
      tariffId,
    });
    expect(member.status).toBe(201);
    const memberId = (member.json as { id: string }).id;
    userIds.push(memberId);

    const listed = await call(unpaid, "GET", "/api/v1/admin/unpaid", coachToken);
    expect(listed.status).toBe(200);
    const rows = listed.json as {
      asOf: string;
      members: { id: string; billingPeriod: string; periodStart: string }[];
    };
    const row = rows.members.find((item) => item.id === memberId);
    expect(row).toBeDefined();

    const recorded = await call(pay, "POST", "/api/v1/admin/payments", coachToken, {
      userId: memberId,
      billingPeriod: row!.billingPeriod,
      periodStart: row!.periodStart,
      amountCents: 7000,
    });
    expect(recorded.status).toBe(201);
  });
});
