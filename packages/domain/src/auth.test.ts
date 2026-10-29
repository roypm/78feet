import { describe, expect, it } from "vitest";
import {
  LOGIN_LOCK_MS,
  LOGIN_MAX_FAILURES,
  clearExpiredLoginLock,
  loginIsLocked,
  registerLoginFailure,
  registerLoginSuccess,
} from "./auth";

const now = new Date("2026-10-29T08:00:00.000Z");

describe("login lockout", () => {
  it("stays open before ten failures", () => {
    let state = { failedLogins: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i += 1) {
      state = registerLoginFailure(state, now);
    }
    expect(state.failedLogins).toBe(9);
    expect(loginIsLocked(state, now)).toBe(false);
  });

  it("locks for 15 minutes on the tenth failure", () => {
    let state = { failedLogins: 9, lockedUntil: null as Date | null };
    state = registerLoginFailure(state, now);
    expect(state.failedLogins).toBe(10);
    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + LOGIN_LOCK_MS);
    expect(loginIsLocked(state, now)).toBe(true);
    expect(loginIsLocked(state, new Date(now.getTime() + LOGIN_LOCK_MS - 1))).toBe(true);
  });

  it("clears the lock when the window expires", () => {
    const locked = registerLoginFailure({ failedLogins: 9, lockedUntil: null }, now);
    const later = new Date(now.getTime() + LOGIN_LOCK_MS);
    expect(loginIsLocked(locked, later)).toBe(false);
    expect(clearExpiredLoginLock(locked, later)).toEqual({
      failedLogins: 0,
      lockedUntil: null,
    });
  });

  it("resets on a successful login", () => {
    expect(registerLoginSuccess()).toEqual({ failedLogins: 0, lockedUntil: null });
  });
});
