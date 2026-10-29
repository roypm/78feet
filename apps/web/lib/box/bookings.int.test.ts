import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/password";
import { signSessionToken } from "../auth/jwt";
import { POST as createMember } from "../../app/api/v1/admin/members/route";
import { POST as grantCredits } from "../../app/api/v1/admin/members/[id]/credits/route";
import { POST as bookAsMember } from "../../app/api/v1/bookings/route";
import { DELETE as cancelAsMember } from "../../app/api/v1/bookings/[id]/route";
import { GET as listMine } from "../../app/api/v1/me/bookings/route";
import { GET as bookingHistory } from "../../app/api/v1/me/bookings/history/route";
import { POST as bookAsStaff } from "../../app/api/v1/admin/bookings/route";
import { DELETE as cancelAsStaff } from "../../app/api/v1/admin/bookings/[id]/route";
import { reserveForMember } from "./bookings";
import { isoDateToDb } from "./time";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("reservar y cancelar", () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const instanceIds: string[] = [];
  const classTypeIds: string[] = [];
  let directedTypeId = "";
  let openTypeId = "";
  let tariffId = "";
  let adminToken = "";
  let coachId = "";
  let coachToken = "";
  let memberId = "";
  let memberToken = "";
  let otherId = "";
  let otherToken = "";
  let weekIndex = 0;

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
    coachId = coach.id;
    adminToken = await signSessionToken({ sub: admin.id, role: "admin", tv: 0 });
    coachToken = await signSessionToken({ sub: coach.id, role: "coach", tv: 0 });

    const tariff = await prisma.tariff.create({
      data: {
        name: `Mensual ${suffix}`,
        kind: "monthly",
        priceCents: 7000,
        weeklyDirected: 1,
        weeklyOpen: 1,
      },
    });
    tariffId = tariff.id;

    memberId = await addMember("Nora", "Norte");
    memberToken = await signSessionToken({ sub: memberId, role: "member", tv: 0 });
    otherId = await addMember("Omar", "Oeste");
    otherToken = await signSessionToken({ sub: otherId, role: "member", tv: 0 });
  });

  afterAll(async () => {
    const ids = [...new Set(userIds)];
    await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
    await prisma.classInstance.deleteMany({ where: { id: { in: instanceIds } } });
    if (classTypeIds.length) await prisma.classType.deleteMany({ where: { id: { in: classTypeIds } } });
    await prisma.creditGrant.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { createdBy: { in: ids } }] },
    });
    await prisma.membership.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    if (tariffId) await prisma.tariff.deleteMany({ where: { id: tariffId } });
    await prisma.$disconnect();
  });

  async function addMember(firstName: string, lastName: string) {
    const dni = `${firstName}-${suffix}`;
    const created = await call(createMember, "POST", "/api/v1/admin/members", adminToken, {
      dni,
      password: "secret-pass",
      firstName,
      lastName,
      tariffId,
    });
    expect(created.status).toBe(201);
    const id = (created.json as { id: string }).id;
    userIds.push(id);
    return id;
  }

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
    const text = await response.text();
    return {
      status: response.status,
      json: (text ? JSON.parse(text) : null) as Record<string, unknown>,
    };
  }

  function openWeek() {
    weekIndex += 1;
    return weekIndex;
  }

  function slot(week: number, hour: number) {
    const startAt = new Date(Date.UTC(2027, 0, 4 + week * 7, hour, 0, 0));
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    return { date: startAt.toISOString().slice(0, 10), startAt, endAt };
  }

  async function createInstance(input: {
    date: string;
    startAt: Date;
    endAt: Date;
    capacity?: number;
    kind?: "directed" | "open";
  }) {
    const kind = input.kind ?? "directed";
    let classTypeId = kind === "open" ? openTypeId : directedTypeId;
    if (!classTypeId) {
      const classType = await prisma.classType.create({
        data: { name: `Clase ${suffix}-${kind}`, kind, imageKey: "placeholder.png" },
      });
      classTypeIds.push(classType.id);
      classTypeId = classType.id;
      if (kind === "open") openTypeId = classTypeId;
      else directedTypeId = classTypeId;
    }
    const row = await prisma.classInstance.create({
      data: {
        date: isoDateToDb(input.date),
        startAt: input.startAt,
        endAt: input.endAt,
        classTypeId,
        kind,
        capacity: input.capacity ?? 10,
        status: "scheduled",
      },
    });
    instanceIds.push(row.id);
    return row;
  }

  it("lets a member book and cancel, and lists only what is still ahead", async () => {
    const week = openWeek();
    const instance = await createInstance(slot(week, 18));
    const booked = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: instance.id,
    });
    expect(booked.status).toBe(201);
    expect(booked.json).toMatchObject({
      userId: memberId,
      createdBy: memberId,
      pool: "weekly_directed",
      status: "active",
      quotaReturned: null,
    });
    const bookingId = (booked.json as { id: string }).id;

    const listed = await call(listMine, "GET", "/api/v1/me/bookings", memberToken);
    expect(listed.status).toBe(200);
    expect(listed.json).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookingId })]),
    );

    const cancelled = await call(
      cancelAsMember,
      "DELETE",
      `/api/v1/bookings/${bookingId}`,
      memberToken,
      undefined,
      { id: bookingId },
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.json).toMatchObject({ status: "cancelled", quotaReturned: true });

    const after = await call(listMine, "GET", "/api/v1/me/bookings", memberToken);
    const rows = after.json as unknown as { id: string }[];
    expect(rows.some((row) => row.id === bookingId)).toBe(false);

    const again = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: instance.id,
    });
    expect(again.status).toBe(201);
  });

  it("rejects a full class, an overlap, and a week without quota", async () => {
    const week = openWeek();
    const onlySeat = await createInstance({ ...slot(week, 10), capacity: 1 });
    const first = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: onlySeat.id,
    });
    expect(first.status).toBe(201);
    const full = await call(bookAsMember, "POST", "/api/v1/bookings", otherToken, {
      instanceId: onlySeat.id,
    });
    expect(full.status).toBe(409);
    expect(full.json).toMatchObject({ error: { code: "FULL" } });

    const early = await createInstance(slot(week, 12));
    const late = await createInstance(slot(week, 12));
    const kept = await call(bookAsMember, "POST", "/api/v1/bookings", otherToken, {
      instanceId: early.id,
    });
    expect(kept.status).toBe(201);
    const overlap = await call(bookAsMember, "POST", "/api/v1/bookings", otherToken, {
      instanceId: late.id,
    });
    expect(overlap.status).toBe(409);
    expect(overlap.json).toMatchObject({ error: { code: "OVERLAP" } });

    const quotaWeek = openWeek();
    const morning = await createInstance(slot(quotaWeek, 9));
    const evening = await createInstance(slot(quotaWeek, 19));
    const used = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: morning.id,
    });
    expect(used.status).toBe(201);
    expect(used.json).toMatchObject({ pool: "weekly_directed" });
    const exhausted = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: evening.id,
    });
    expect(exhausted.status).toBe(409);
    expect(exhausted.json).toMatchObject({ error: { code: "QUOTA_EXHAUSTED" } });

    const credited = await call(
      grantCredits,
      "POST",
      `/api/v1/admin/members/${memberId}/credits`,
      coachToken,
      { quantity: 1 },
      { id: memberId },
    );
    expect(credited.status).toBe(201);
    const fromPack = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: evening.id,
    });
    expect(fromPack.status).toBe(201);
    expect(fromPack.json).toMatchObject({ pool: "pack" });
  }, 20_000);

  it("closes member cancellation inside two hours and lets staff decide the quota", async () => {
    const startAt = new Date(Date.now() + 30 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    const soon = await createInstance({
      date: startAt.toISOString().slice(0, 10),
      startAt,
      endAt,
    });
    const booked = await call(bookAsStaff, "POST", "/api/v1/admin/bookings", coachToken, {
      instanceId: soon.id,
      userId: otherId,
    });
    expect(booked.status).toBe(201);
    expect(booked.json).toMatchObject({ createdBy: coachId, userId: otherId });
    const bookingId = (booked.json as { id: string }).id;

    const closed = await call(
      cancelAsMember,
      "DELETE",
      `/api/v1/bookings/${bookingId}`,
      otherToken,
      undefined,
      { id: bookingId },
    );
    expect(closed.status).toBe(403);
    expect(closed.json).toMatchObject({ error: { code: "CANCELLATION_CLOSED" } });

    const kept = await call(
      cancelAsStaff,
      "DELETE",
      `/api/v1/admin/bookings/${bookingId}?returnQuota=false`,
      coachToken,
      undefined,
      { id: bookingId },
    );
    expect(kept.status).toBe(200);
    expect(kept.json).toMatchObject({ status: "cancelled", quotaReturned: false, cancelledBy: coachId });

    const sameWeek = await createInstance({
      date: startAt.toISOString().slice(0, 10),
      startAt: new Date(startAt.getTime() + 3 * 60 * 60 * 1000),
      endAt: new Date(startAt.getTime() + 4 * 60 * 60 * 1000),
    });
    const stillCounts = await call(bookAsMember, "POST", "/api/v1/bookings", otherToken, {
      instanceId: sameWeek.id,
    });
    expect(stillCounts.status).toBe(409);
    expect(stillCounts.json).toMatchObject({ error: { code: "QUOTA_EXHAUSTED" } });
  });

  it("rejects missing membership, foreign bookings, and the wrong role", async () => {
    const week = openWeek();
    const instance = await createInstance(slot(week, 18));
    const outsider = await prisma.user.create({
      data: {
        loginId: `outsider-${suffix}`,
        passwordHash: await hashPassword("secret-pass"),
        role: "member",
        status: "active",
        firstName: "Sin",
        lastName: "Tarifa",
      },
    });
    userIds.push(outsider.id);

    const noMembership = await call(bookAsStaff, "POST", "/api/v1/admin/bookings", adminToken, {
      instanceId: instance.id,
      userId: outsider.id,
    });
    expect(noMembership.status).toBe(409);
    expect(noMembership.json).toMatchObject({ error: { code: "NO_MEMBERSHIP" } });

    const missing = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: "00000000-0000-4000-8000-000000000000",
    });
    expect(missing.status).toBe(404);

    const anon = await call(bookAsMember, "POST", "/api/v1/bookings", null, {
      instanceId: instance.id,
    });
    expect(anon.status).toBe(401);

    const coachOnMemberRoute = await call(bookAsMember, "POST", "/api/v1/bookings", coachToken, {
      instanceId: instance.id,
    });
    expect(coachOnMemberRoute.status).toBe(403);

    const memberOnStaffRoute = await call(bookAsStaff, "POST", "/api/v1/admin/bookings", memberToken, {
      instanceId: instance.id,
      userId: memberId,
    });
    expect(memberOnStaffRoute.status).toBe(403);

    const booked = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, {
      instanceId: instance.id,
    });
    expect(booked.status).toBe(201);
    const bookingId = (booked.json as { id: string }).id;
    const stolen = await call(
      cancelAsMember,
      "DELETE",
      `/api/v1/bookings/${bookingId}`,
      otherToken,
      undefined,
      { id: bookingId },
    );
    expect(stolen.status).toBe(404);

    await prisma.user.update({ where: { id: outsider.id }, data: { status: "inactive" } });
    const inactive = await call(bookAsStaff, "POST", "/api/v1/admin/bookings", adminToken, {
      instanceId: instance.id,
      userId: outsider.id,
    });
    expect(inactive.status).toBe(403);

    const cancelledClass = await createInstance(slot(openWeek(), 11));
    await prisma.classInstance.update({
      where: { id: cancelledClass.id },
      data: { status: "cancelled" },
    });
    const closedClass = await call(bookAsMember, "POST", "/api/v1/bookings", otherToken, {
      instanceId: cancelledClass.id,
    });
    expect(closedClass.status).toBe(403);
    expect(closedClass.json).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("holds the instance lock so the last spot cannot be taken twice", async () => {
    const week = openWeek();
    const instance = await createInstance({ ...slot(week, 16), capacity: 1 });
    let releaseHold = () => {};
    const hold = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    let locked = false;
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "class_instance" WHERE id = ${instance.id}::uuid FOR UPDATE`;
        locked = true;
        await hold;
        await tx.booking.create({
          data: {
            instanceId: instance.id,
            userId: memberId,
            pool: "weekly_directed",
            status: "active",
            createdBy: memberId,
          },
        });
      },
      { timeout: 20_000 },
    );

    const deadline = Date.now() + 5_000;
    while (!locked && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(locked).toBe(true);

    const attempt = reserveForMember({
      memberId: otherId,
      instanceId: instance.id,
      createdBy: otherId,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    releaseHold();
    await holder;

    await expect(attempt).rejects.toMatchObject({ code: "FULL" });
    expect(
      await prisma.booking.count({ where: { instanceId: instance.id, status: "active" } }),
    ).toBe(1);
  });

  it("lists past bookings in history and keeps upcoming classes out of it", async () => {
    const september = await createInstance({
      date: "2026-09-15",
      startAt: new Date("2026-09-15T08:00:00.000Z"),
      endAt: new Date("2026-09-15T09:00:00.000Z"),
    });
    await prisma.classInstance.update({ where: { id: september.id }, data: { coachId } });
    const august = await createInstance({
      date: "2026-08-03",
      startAt: new Date("2026-08-03T16:00:00.000Z"),
      endAt: new Date("2026-08-03T17:00:00.000Z"),
    });
    await prisma.classInstance.update({ where: { id: august.id }, data: { status: "cancelled" } });
    const ahead = await createInstance(slot(openWeek(), 11));

    const kept = await prisma.booking.create({
      data: {
        instanceId: september.id,
        userId: memberId,
        pool: "weekly_directed",
        status: "active",
        createdBy: memberId,
      },
    });
    const dropped = await prisma.booking.create({
      data: {
        instanceId: august.id,
        userId: memberId,
        pool: "weekly_directed",
        status: "cancelled",
        quotaReturned: true,
        cancelledAt: new Date("2026-08-01T10:00:00.000Z"),
        cancelledBy: memberId,
        createdBy: memberId,
      },
    });
    const upcoming = await call(bookAsMember, "POST", "/api/v1/bookings", memberToken, { instanceId: ahead.id });
    expect(upcoming.status).toBe(201);

    const denied = await call(bookingHistory, "GET", "/api/v1/me/bookings/history", coachToken);
    expect(denied.status).toBe(403);

    const history = await call(bookingHistory, "GET", "/api/v1/me/bookings/history", memberToken);
    expect(history.status).toBe(200);
    const rows = history.json as unknown as {
      id: string;
      status: string;
      boxCancelled: boolean;
      coachName: string | null;
      instance: { date: string };
    }[];
    expect(rows.map((row) => row.id)).toEqual([kept.id, dropped.id]);
    expect(rows[0]).toMatchObject({ status: "active", boxCancelled: false, coachName: "Ciro Coach" });
    expect(rows[1]).toMatchObject({ status: "cancelled", boxCancelled: true, coachName: null });

    const listed = await call(listMine, "GET", "/api/v1/me/bookings", memberToken);
    const upcomingRows = listed.json as unknown as { instanceId: string }[];
    expect(upcomingRows.some((row) => row.instanceId === ahead.id)).toBe(true);
    expect(upcomingRows.some((row) => row.instanceId === september.id || row.instanceId === august.id)).toBe(false);
  });
});
