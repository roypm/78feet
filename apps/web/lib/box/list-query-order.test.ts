import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  user: { count: vi.fn(), findMany: vi.fn() }, training: { count: vi.fn(), findMany: vi.fn() },
  payment: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
import { listMembersPage } from "./members";
import { listTrainingsPage, listStaffTrainingsPage } from "./trainings";
import { listUnpaidPage } from "./unpaid";
import { listRegisteredPaymentsPage } from "./registered-payments";
import { listStaff } from "./staff-users";

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of [db.user, db.training, db.payment]) {
    model.count.mockResolvedValue(60);
    model.findMany.mockResolvedValue([]);
  }
  db.payment.aggregate.mockResolvedValue({ _sum: { amountCents: 100 } });
});

describe("sorting occurs in SQL before pagination", () => {
  it("sorts all members and unpaid members before taking the second page", async () => {
    await listMembersPage("inactive", 2, "nombre-desc");
    expect(db.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      skip: 25, take: 25, where: { role: "member", status: "inactive" },
      orderBy: [{ firstName: "desc" }, { lastName: "desc" }, { id: "asc" }],
    }));
    await listUnpaidPage("2026-11-12", 2, "box-id", "apellidos-desc");
    expect(db.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      skip: 25, take: 25, where: expect.objectContaining({ paymentBoxId: "box-id" }),
      orderBy: [{ lastName: "desc" }, { firstName: "desc" }, { id: "asc" }],
    }));
  });
  it("keeps the same ordering contract in both libraries", async () => {
    for (const load of [listTrainingsPage, listStaffTrainingsPage]) {
      await load("type-id", 2, "nombre-asc");
      expect(db.training.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
        skip: 25, take: 25, where: { classTypeId: "type-id" }, orderBy: [{ name: "asc" }, { id: "asc" }],
      }));
    }
  });
  it("sorts payments by amount without losing the box filter", async () => {
    await listRegisteredPaymentsPage("box-id", 2, "importe-asc");
    expect(db.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 25, take: 25, where: { paymentBoxId: "box-id" },
      orderBy: [{ amountCents: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    }));
  });
  it("filters team accounts without admitting members", async () => {
    await listStaff({ role: "coach", status: "inactive", order: "nombre-asc" });
    expect(db.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { role: "coach", status: "inactive" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
    }));
    await listStaff();
    expect(db.user.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { role: { in: ["coach", "admin"] } },
    }));
  });
});
