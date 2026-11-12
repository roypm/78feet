import { expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));
import { getMember } from "./members";

it("loads a member profile without querying or returning historical collections", async () => {
  findUnique.mockResolvedValue({
    id: "member", role: "member", loginId: "12345678Z", dni: "12345678Z",
    firstName: "Marta", lastName: "García", phone: null, email: null, status: "active",
    memberships: [], profileImage: null, paymentBox: null,
  });
  const member = await getMember("member");
  expect(member).toMatchObject({ id: "member", firstName: "Marta", membership: null });
  const relations = findUnique.mock.lastCall?.[0].include;
  for (const historical of ["bookingsAsMember", "paymentsReceived", "creditGrantsReceived"]) {
    expect(relations).not.toHaveProperty(historical);
  }
  expect(relations.memberships.where).toEqual({ endedAt: null });
  for (const historical of ["bookings", "payments", "credits", "membershipHistory"]) {
    expect(member).not.toHaveProperty(historical);
  }
});
