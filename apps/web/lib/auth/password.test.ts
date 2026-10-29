import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("argon2id passwords", () => {
  it("verifies a hash and rejects a wrong password", async () => {
    const hash = await hashPassword("box-secret");
    await expect(verifyPassword(hash, "box-secret")).resolves.toBe(true);
    await expect(verifyPassword(hash, "nope")).resolves.toBe(false);
    expect(hash).not.toContain("box-secret");
  });
});
