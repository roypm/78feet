import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { atBoxTime, defaultBoxHours, localDateString } from "@78feet/domain";
import { hashPassword } from "../auth/password";
import { loginWithPassword } from "../auth/login";
import { reserveForMember, cancelStaffBooking } from "./bookings";
import { patchInstance } from "./instances";
import { changeMemberTariff } from "./members";
import { memberConsumption } from "./consumption";
import { listMemberPayments } from "./payments";
import { isoDateToDb } from "./time";

const enabled = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!enabled)("operaciones concurrentes", () => {
  const db = new PrismaClient();
  const memberId = randomUUID(),
    coachId = randomUUID(),
    boxId = randomUUID(),
    typeId = randomUUID();
  const tariffId = randomUUID(),
    nextTariffId = randomUUID();
  const loginId = `race-${memberId}`;
  const date = localDateString(new Date(Date.now() + 30 * 86400_000));

  beforeAll(async () => {
    const passwordHash = await hashPassword("test-password");
    await db.user.createMany({
      data: [
        {
          id: memberId,
          loginId,
          passwordHash,
          role: "member",
          status: "active",
          firstName: "Marta",
          lastName: "Pruebas",
        },
        {
          id: coachId,
          loginId: `coach-${coachId}`,
          passwordHash,
          role: "coach",
          status: "active",
          firstName: "Coach",
          lastName: "Pruebas",
        },
      ],
    });
    await db.box.create({ data: { slug: `race-${boxId}`, id: boxId, name: `race-${boxId}`, weeklyHours: defaultBoxHours().weekly } });
    await db.classType.create({ data: { slug: `race-${typeId}`, id: typeId, name: "Prueba concurrente", kind: "directed" } });
    await db.tariff.createMany({
      data: [tariffId, nextTariffId].map((id) => ({
        id,
        name: `race-${id}`,
        consumptionModel: "weekly_quota",
        billingPeriod: "monthly",
        priceCents: 0,
        quotaDirected: 10,
        quotaOpen: 10,
      })),
    });
  });

  beforeEach(async () => {
    await db.booking.deleteMany({ where: { userId: memberId } });
    await db.classInstance.deleteMany({ where: { boxId } });
    await db.membership.deleteMany({ where: { userId: memberId } });
    await db.membership.create({ data: { userId: memberId, tariffId, startedAt: new Date() } });
  });

  async function instance(hour = 8) {
    return db.classInstance.create({
      data: {
        boxId,
        classTypeId: typeId,
        kind: "directed",
        date: isoDateToDb(date),
        startAt: atBoxTime(date, `${String(hour).padStart(2, "0")}:00`),
        endAt: atBoxTime(date, `${String(hour + 1).padStart(2, "0")}:00`),
        capacity: 10,
        status: "scheduled",
      },
    });
  }

  it("cuenta diez fallos paralelos y bloquea la cuenta", async () => {
    await db.user.update({ where: { id: memberId }, data: { failedLogins: 0, lockedUntil: null } });
    await Promise.all(Array.from({ length: 10 }, () => loginWithPassword(loginId, "incorrecta")));
    const user = await db.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(user.failedLogins).toBe(10);
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  }, 30_000);

  it("solo deja mover una clase al hueco compartido", async () => {
    const [a, b] = await Promise.all([instance(8), instance(10)]);
    const results = await Promise.allSettled(
      [a, b].map((row) => patchInstance(row.id, { startTime: "12:00", endTime: "13:00" }, coachId)),
    );
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.find((row) => row.status === "rejected")).toMatchObject({ reason: { code: "OVERLAP" } });
  });

  async function holdRow(table: "user" | "class_instance", id: string) {
    let release!: () => void;
    let ready!: (value: { pid: number; tx: import("@prisma/client").Prisma.TransactionClient }) => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<{ pid: number; tx: import("@prisma/client").Prisma.TransactionClient }>((resolve) => {
      ready = resolve;
    });
    const transaction = db.$transaction(
      async (tx) => {
        if (table === "user") await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${id}::uuid FOR UPDATE`;
        else await tx.$queryRaw`SELECT id FROM class_instance WHERE id = ${id}::uuid FOR UPDATE`;
        const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
        ready({ pid: backend!.pid, tx });
        await held;
      },
      { timeout: 20_000 },
    );
    return { ...(await acquired), release, transaction };
  }

  async function waitForBlocked(pid: number, count = 1) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`WITH RECURSIVE blocked AS (
        SELECT pid FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
        UNION
        SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid = ANY(pg_blocking_pids(a.pid))
      ) SELECT count(*) FROM blocked`;
      if (Number(rows[0]!.count) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("La operación no esperó al bloqueo");
  }

  it("no permite que una cancelación reescriba una devolución ya confirmada", async () => {
    const row = await instance();
    const booking = await reserveForMember({ memberId, instanceId: row.id, createdBy: memberId });
    const holder = await holdRow("class_instance", row.id);
    const cancellation = cancelStaffBooking(booking.id, coachId, false);
    const checked = expect(cancellation).rejects.toMatchObject({ status: 404 });
    try {
      await waitForBlocked(holder.pid);
      await db.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled", quotaReturned: true, cancelledBy: coachId },
      });
    } finally {
      holder.release();
      await holder.transaction;
    }
    await checked;
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).quotaReturned).toBe(true);
  });

  it("vuelve a leer el coach después de esperar por la edición de la clase", async () => {
    const row = await instance();
    const holder = await holdRow("class_instance", row.id);
    const editing = patchInstance(row.id, { capacity: 12 }, coachId);
    try {
      await waitForBlocked(holder.pid);
      await holder.tx.classInstance.update({ where: { id: row.id }, data: { coachId } });
      holder.release();
      await holder.transaction;
      await editing;
    } finally {
      holder.release();
    }
    expect(await db.classInstance.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
      coachId,
      capacity: 12,
    });
  });

  it("coordina una reserva y el cambio de tarifa sobre el mismo socio", async () => {
    const row = await instance();
    const holder = await holdRow("user", memberId);
    const booking = reserveForMember({ memberId, instanceId: row.id, createdBy: memberId });
    let change: ReturnType<typeof changeMemberTariff> | undefined;
    try {
      await waitForBlocked(holder.pid);
      change = changeMemberTariff(memberId, nextTariffId, coachId);
      await waitForBlocked(holder.pid, 2);
    } finally {
      holder.release();
      await holder.transaction;
    }
    await booking;
    await change;
    expect(await db.booking.count({ where: { userId: memberId, status: "active" } })).toBe(0);
    expect((await db.membership.findFirstOrThrow({ where: { userId: memberId, endedAt: null } })).tariffId).toBe(
      nextTariffId,
    );
  });

  it("cuenta el cupo del periodo sin arrastrar el historial anterior", async () => {
    const row = await instance();
    await db.booking.create({
      data: { instanceId: row.id, userId: memberId, pool: "quota_directed", status: "active", createdBy: memberId },
    });
    expect((await memberConsumption(db, memberId, date, "week")).usedDirected).toBe(1);
    expect((await memberConsumption(db, memberId, "2020-01-01", "week")).usedDirected).toBe(0);
  });

  it("pagina pagos y ajusta una página que excede el total", async () => {
    await db.payment.createMany({
      data: Array.from({ length: 26 }, () => ({
        userId: memberId,
        recordedBy: coachId,
        paymentBoxId: boxId,
        billingPeriod: "one_time" as const,
        amountCents: 0,
      })),
    });
    const first = await listMemberPayments(memberId);
    const last = await listMemberPayments(memberId, 99);
    expect(first.payments).toHaveLength(25);
    expect(last.payments).toHaveLength(1);
    expect(last.pageInfo.page).toBe(2);
    expect(new Set([...first.payments, ...last.payments].map((payment) => payment.id)).size).toBe(26);
  });

  afterAll(async () => {
    await db.payment.deleteMany({ where: { userId: memberId } });
    await db.booking.deleteMany({ where: { userId: memberId } });
    await db.classInstance.deleteMany({ where: { boxId } });
    await db.membership.deleteMany({ where: { userId: memberId } });
    await db.tariff.deleteMany({ where: { id: { in: [tariffId, nextTariffId] } } });
    await db.classType.deleteMany({ where: { id: typeId } });
    await db.box.deleteMany({ where: { id: boxId } });
    await db.user.deleteMany({ where: { id: { in: [memberId, coachId] } } });
    await db.$disconnect();
  });
});
