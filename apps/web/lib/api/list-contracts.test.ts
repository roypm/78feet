import { describe, expect, it, vi } from "vitest";

const pageInfo = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
const mocks = vi.hoisted(() => ({
  members: vi.fn(), unpaid: vi.fn(), staffTrainings: vi.fn(), trainings: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ loadActiveUserFromRequest: async () => ({ role: "coach" }) }));
vi.mock("@/lib/box/members", () => ({ listMembersPage: mocks.members, createMember: vi.fn() }));
vi.mock("@/lib/box/unpaid", () => ({ listUnpaidPage: mocks.unpaid }));
vi.mock("@/lib/box/trainings", () => ({
  listStaffTrainingsPage: mocks.staffTrainings, listTrainingsPage: mocks.trainings,
  listTrainingFilterTypes: async () => [], createTraining: vi.fn(),
}));

import { GET as members } from "@/app/api/v1/admin/members/route";
import { GET as unpaid } from "@/app/api/v1/admin/unpaid/route";
import { GET as staffTrainings } from "@/app/api/v1/admin/trainings/route";
import { GET as trainings } from "@/app/api/v1/trainings/route";

describe("collection response contracts", () => {
  for (const [name, handler, mock] of [
    ["members", members, mocks.members], ["unpaid", unpaid, mocks.unpaid],
    ["staffTrainings", staffTrainings, mocks.staffTrainings], ["trainings", trainings, mocks.trainings],
  ] as const) {
    it(`${name} returns a paginated object with and without page`, async () => {
      mock.mockResolvedValue({ items: [], pageInfo });
      for (const query of ["", "?page=2"]) {
        const response = await handler(new Request(`http://localhost/api/list${query}`), { params: Promise.resolve({}) });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ items: [], pageInfo });
        expect(mock.mock.lastCall?.[1]).toBe(query ? 2 : 1);
      }
    });
  }
});
