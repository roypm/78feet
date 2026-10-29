export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

export type LoginLockState = {
  failedLogins: number;
  lockedUntil: Date | null;
};

export function loginIsLocked(state: LoginLockState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

export function clearExpiredLoginLock(state: LoginLockState, now: Date): LoginLockState {
  if (state.lockedUntil !== null && state.lockedUntil.getTime() <= now.getTime()) {
    return { failedLogins: 0, lockedUntil: null };
  }
  return state;
}

export function registerLoginFailure(state: LoginLockState, now: Date): LoginLockState {
  const current = clearExpiredLoginLock(state, now);
  if (loginIsLocked(current, now)) {
    return current;
  }
  const failedLogins = current.failedLogins + 1;
  if (failedLogins >= LOGIN_MAX_FAILURES) {
    return {
      failedLogins,
      lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS),
    };
  }
  return { failedLogins, lockedUntil: null };
}

export function registerLoginSuccess(): LoginLockState {
  return { failedLogins: 0, lockedUntil: null };
}
