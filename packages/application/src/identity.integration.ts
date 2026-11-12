import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { memberAuth, staffAuth } from '@78feet/db/auth-schema';
import { provisionAccount, resetAccountPassword } from './identity.ts';
import { fixtureIds } from './seed.ts';
import { user } from '@78feet/db/schema';
import type { Database } from '@78feet/db/connection';

export async function verifyIdentity(db: Database) {
  const blocked = ['/sign-in/email', '/sign-up/email', '/request-password-reset', '/reset-password', '/send-verification-email', '/verify-email', '/change-email'];
  function realm(name: 'member' | 'staff') {
    return betterAuth({ baseURL: 'http://localhost:3000', basePath: `/auth/${name}`, secret: 'test-only-better-auth-secret-with-at-least-32-characters', database: drizzleAdapter(db, { provider: 'pg', schema: name === 'member' ? memberAuth : staffAuth, transaction: true }), emailAndPassword: { enabled: true, requireEmailVerification: false }, advanced: { cookiePrefix: `feet-${name}` }, disabledPaths: blocked, session: { cookieCache: { enabled: false } }, plugins: [username({ minUsernameLength: 1, maxUsernameLength: 256, usernameValidator: value => value.length > 0 && !value.includes('@') })] });
  }
  const member = realm('member');
  const staff = realm('staff');
  const common = { firstName: 'Identidad', lastName: 'Local', email: 'identity@example.org', boxId: fixtureIds.box };
  const memberAccount = await provisionAccount(db, { ...common, role: 'member', loginId: '12345678Z', password: 'member-password', tariffId: fixtureIds.tariff });
  await provisionAccount(db, { ...common, role: 'coach', loginId: 'identity-coach', password: 'staff-password' });
  const login = async (auth: typeof member, loginId: string, password: string) => auth.handler(new Request(`http://localhost:3000${auth.options.basePath}/sign-in/username`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify({ username: loginId, password }) }));
  const response = await login(member, '12345678z', 'member-password');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.user.emailVerified, false);
  assert.equal(payload.user.email, common.email);
  assert.equal((await login(staff, 'identity-coach', 'staff-password')).status, 200);
  assert.equal((await login(member, '12345678z', 'staff-password')).status, 401);
  assert.ok([401, 422].includes((await login(member, common.email, 'member-password')).status));
  for (const auth of [member, staff]) for (const path of blocked) {
    const result = await auth.handler(new Request(`http://localhost:3000${auth.options.basePath}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: common.email, password: 'member-password' }) }));
    assert.equal(result.status, 404, path);
  }
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const session = () => member.api.getSession({ headers: new Headers({ cookie }) });
  assert.ok(await session());
  await resetAccountPassword(db, memberAccount.id, 'new-member-password');
  assert.equal(await session(), null, 'reset revokes existing Better Auth session');
  assert.equal((await login(member, '12345678z', 'member-password')).status, 401);
  assert.equal((await login(member, '12345678z', 'new-member-password')).status, 200);
  const before = await db.select({ id: memberAuth.user.id }).from(memberAuth.user);
  await assert.rejects(provisionAccount(db, { ...common, email: 'rollback@example.org', role: 'member', loginId: '12345678X', password: 'member-password', tariffId: '00000000-0000-4000-8000-000000000099' }));
  assert.equal((await db.select({ id: memberAuth.user.id }).from(memberAuth.user)).length, before.length, 'failed membership leaves no identity');
  assert.equal((await db.select({ id: user.id }).from(user).where(eq(user.dni, '12345678X'))).length, 0);
  console.log('PASS: real Better Auth Drizzle adapter, atomic provisioning, shared email/independent credentials, disabled HTTP paths, reset/session revocation');
}
