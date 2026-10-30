import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/password";
import { signSessionToken } from "../auth/jwt";
import { POST as createTariff, GET as listTariffs } from "../../app/api/v1/admin/tariffs/route";
import { PATCH as patchTariff } from "../../app/api/v1/admin/tariffs/[id]/route";
import { GET as listMembers, POST as createMember } from "../../app/api/v1/admin/members/route";
import { POST as changeTariff } from "../../app/api/v1/admin/members/[id]/tariff/route";
import { POST as grantCredits } from "../../app/api/v1/admin/members/[id]/credits/route";
import { POST as resetPassword } from "../../app/api/v1/admin/members/[id]/reset-password/route";
import { POST as deactivateMember } from "../../app/api/v1/admin/members/[id]/deactivate/route";
import { GET as listTemplates, POST as createTemplate } from "../../app/api/v1/admin/templates/route";
import { DELETE as deleteTemplate } from "../../app/api/v1/admin/templates/[id]/route";
import { POST as materialize } from "../../app/api/v1/cron/materialize/route";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("datos del box", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const tariffIds: string[] = [];
  const templateIds: string[] = [];
  const classTypeIds: string[] = [];
  let adminToken = "";
  let coachToken = "";
  let memberToken = "";
  let previousCron: string | undefined;

  beforeAll(async () => {
    previousCron = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-cron-secret";
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
  });

  afterAll(async () => {
    if (previousCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCron;
    const users = await prisma.user.findMany({
      where: { loginId: { contains: suffix } },
      select: { id: true },
    });
    const ids = [...new Set([...userIds, ...users.map((user) => user.id)])];
    const templatesToDrop = [...new Set(templateIds)];
    await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
    await prisma.classInstance.deleteMany({
      where: {
        OR: [
          { templateId: { in: templatesToDrop } },
          { classTypeId: { in: classTypeIds } },
        ],
      },
    });
    await prisma.classTemplate.deleteMany({
      where: {
        OR: [{ id: { in: templatesToDrop } }, { classTypeId: { in: classTypeIds } }],
      },
    });
    if (classTypeIds.length) await prisma.classType.deleteMany({ where: { id: { in: classTypeIds } } });
    await prisma.creditGrant.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { createdBy: { in: ids } }] },
    });
    await prisma.membership.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.tariff.deleteMany({
      where: { OR: [{ id: { in: tariffIds } }, { name: { contains: suffix } }] },
    });
    await prisma.$disconnect();
  });

  async function call(
    handler: (request: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>,
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
    const response = await handler(request, params ? { params: Promise.resolve(params) } : undefined);
    return { status: response.status, json: (await response.json()) as Record<string, unknown> };
  }

  it("lets an admin manage tariffs and blocks a coach from writing them", async () => {
    const denied = await call(createTariff, "POST", "/api/v1/admin/tariffs", coachToken, {
      name: `Mensual ${suffix}`,
      kind: "monthly",
      priceCents: 7000,
      weeklyDirected: 3,
      weeklyOpen: 1,
    });
    expect(denied.status).toBe(403);

    const created = await call(createTariff, "POST", "/api/v1/admin/tariffs", adminToken, {
      name: `Mensual ${suffix}`,
      kind: "monthly",
      priceCents: 7000,
      weeklyDirected: 3,
      weeklyOpen: 1,
    });
    expect(created.status).toBe(201);
    const tariff = created.json as { id: string; kind: string };
    tariffIds.push(tariff.id);

    const invalid = await call(createTariff, "POST", "/api/v1/admin/tariffs", adminToken, {
      name: `Rota ${suffix}`,
      kind: "pack",
      priceCents: 1000,
    });
    expect(invalid.status).toBe(400);

    const patched = await call(
      patchTariff,
      "PATCH",
      `/api/v1/admin/tariffs/${tariff.id}`,
      adminToken,
      { priceCents: 7500 },
      { id: tariff.id },
    );
    expect(patched.status).toBe(200);
    expect(patched.json).toMatchObject({ id: tariff.id, priceCents: 7500 });

    const listed = await call(listTariffs, "GET", "/api/v1/admin/tariffs", coachToken);
    expect(listed.status).toBe(200);
    expect(listed.json).toEqual(expect.arrayContaining([expect.objectContaining({ id: tariff.id })]));
  });

  it("creates a member, reloads pack balance, and returns quota when the tariff changes", async () => {
    const monthly = await call(createTariff, "POST", "/api/v1/admin/tariffs", adminToken, {
      name: `Base ${suffix}`,
      kind: "monthly",
      priceCents: 6000,
      weeklyDirected: 2,
      weeklyOpen: 1,
    });
    const pack = await call(createTariff, "POST", "/api/v1/admin/tariffs", adminToken, {
      name: `Bono ${suffix}`,
      kind: "pack",
      priceCents: 5000,
      packClasses: 8,
    });
    expect(monthly.status).toBe(201);
    expect(pack.status).toBe(201);
    const monthlyId = (monthly.json as { id: string }).id;
    const packId = (pack.json as { id: string }).id;
    tariffIds.push(monthlyId, packId);

    const dni = `dni-${suffix}`;
    const member = await call(createMember, "POST", "/api/v1/admin/members", coachToken, {
      dni,
      password: "secret-pass",
      firstName: "Marta",
      lastName: "García",
      tariffId: monthlyId,
    });
    expect(member.status).toBe(201);
    const memberId = (member.json as { id: string; loginId: string }).id;
    expect((member.json as { loginId: string }).loginId).toBe(dni);
    userIds.push(memberId);
    memberToken = await signSessionToken({ sub: memberId, role: "member", tv: 0 });

    const credits = await call(
      grantCredits,
      "POST",
      `/api/v1/admin/members/${memberId}/credits`,
      adminToken,
      { quantity: 4, note: "clases extra" },
      { id: memberId },
    );
    expect(credits.status).toBe(201);
    expect(credits.json).toMatchObject({ balance: 4 });

    const wodType = await prisma.classType.create({
      data: { name: `WOD ${suffix}`, kind: "directed", imageKey: "placeholder.png" },
    });
    const openType = await prisma.classType.create({
      data: { name: `Open ${suffix}`, kind: "open", imageKey: "placeholder.png" },
    });
    classTypeIds.push(wodType.id, openType.id);
    const template = await call(createTemplate, "POST", "/api/v1/admin/templates", adminToken, {
      weekday: 1,
      startTime: "05:10",
      endTime: "06:10",
      classTypeId: wodType.id,
      defaultCapacity: 12,
    });
    expect(template.status).toBe(201);
    const templateId = (template.json as { template: { id: string; startTime: string } }).template.id;
    const createdCount = (template.json as { createdInstanceCount: number }).createdInstanceCount;
    expect(createdCount).toBeGreaterThan(0);
    expect((template.json as { template: { startTime: string } }).template.startTime).toBe("05:10:00");
    templateIds.push(templateId);

    const parallelOpen = await call(createTemplate, "POST", "/api/v1/admin/templates", adminToken, {
      weekday: 1,
      startTime: "05:40",
      endTime: "06:40",
      classTypeId: openType.id,
      defaultCapacity: 10,
    });
    expect(parallelOpen.status).toBe(201);
    templateIds.push((parallelOpen.json as { template: { id: string } }).template.id);

    const sameKindOverlap = await call(createTemplate, "POST", "/api/v1/admin/templates", adminToken, {
      weekday: 1,
      startTime: "05:40",
      endTime: "06:40",
      classTypeId: wodType.id,
      defaultCapacity: 8,
    });
    expect(sameKindOverlap.status).toBe(409);

    const instance = await prisma.classInstance.findFirstOrThrow({
      where: { templateId, status: "scheduled", startAt: { gt: new Date() } },
      orderBy: { startAt: "asc" },
    });
    const admin = await prisma.user.findFirstOrThrow({ where: { loginId: `admin-${suffix}` } });
    await prisma.booking.create({
      data: {
        instanceId: instance.id,
        userId: memberId,
        pool: "weekly_directed",
        status: "active",
        createdBy: admin.id,
      },
    });

    const changed = await call(
      changeTariff,
      "POST",
      `/api/v1/admin/members/${memberId}/tariff`,
      coachToken,
      { tariffId: packId },
      { id: memberId },
    );
    expect(changed.status).toBe(200);
    expect(changed.json).toMatchObject({ cancelledBookingCount: 1 });
    const stored = await prisma.booking.findFirstOrThrow({ where: { userId: memberId } });
    expect(stored.status).toBe("cancelled");
    expect(stored.quotaReturned).toBe(true);

    const listed = await call(listMembers, "GET", "/api/v1/admin/members", coachToken);
    expect(listed.json).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: memberId, loginId: dni })]),
    );

    const reset = await call(
      resetPassword,
      "POST",
      `/api/v1/admin/members/${memberId}/reset-password`,
      coachToken,
      { password: "nueva-clave" },
      { id: memberId },
    );
    expect(reset.status).toBe(200);
    const stale = await call(listMembers, "GET", "/api/v1/admin/members", memberToken);
    expect(stale.status).toBe(401);

    const coachDenied = await call(
      deactivateMember,
      "POST",
      `/api/v1/admin/members/${memberId}/deactivate`,
      coachToken,
      undefined,
      { id: memberId },
    );
    expect(coachDenied.status).toBe(403);
    const removed = await call(
      deactivateMember,
      "POST",
      `/api/v1/admin/members/${memberId}/deactivate`,
      adminToken,
      undefined,
      { id: memberId },
    );
    expect(removed.status).toBe(200);
    expect(removed.json).toMatchObject({ status: "inactive" });

    const removedTemplate = await call(
      deleteTemplate,
      "DELETE",
      `/api/v1/admin/templates/${templateId}`,
      adminToken,
      undefined,
      { id: templateId },
    );
    expect(removedTemplate.status).toBe(200);
    const summary = (removedTemplate.json as { summary: { cancelledClassCount: number } }).summary;
    expect(summary.cancelledClassCount).toBeGreaterThan(0);
    expect(await prisma.classInstance.count({ where: { templateId, status: "scheduled" } })).toBe(0);
    const visible = await call(listTemplates, "GET", "/api/v1/admin/templates", adminToken);
    const rows = visible.json as unknown as { id: string }[];
    expect(rows.some((row) => row.id === templateId)).toBe(false);
  }, 30_000);

  it("rejects the cron without its secret and materializes with it", async () => {
    const denied = await call(materialize, "POST", "/api/v1/cron/materialize", null);
    expect(denied.status).toBe(401);
    const allowed = await call(materialize, "POST", "/api/v1/cron/materialize", "test-cron-secret");
    expect(allowed.status).toBe(200);
    expect(allowed.json).toEqual(
      expect.objectContaining({
        created: expect.any(Number),
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });
});
