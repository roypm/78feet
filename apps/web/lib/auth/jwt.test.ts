import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./jwt";

describe("session JWT", () => {
  it("round-trips sub, role and token version", async () => {
    process.env.JWT_SECRET = "test-secret-for-jwt-unit-tests-32b";
    const token = await signSessionToken({ sub: "11111111-1111-4111-8111-111111111111", role: "admin", tv: 3 });
    await expect(verifySessionToken(token)).resolves.toEqual({
      sub: "11111111-1111-4111-8111-111111111111",
      role: "admin",
      tv: 3,
    });
  });

  it("rejects a token signed with another secret", async () => {
    process.env.JWT_SECRET = "test-secret-for-jwt-unit-tests-32b";
    const token = await signSessionToken({ sub: "11111111-1111-4111-8111-111111111111", role: "member", tv: 0 });
    process.env.JWT_SECRET = "another-secret-for-jwt-unit-tests-32";
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });
});
