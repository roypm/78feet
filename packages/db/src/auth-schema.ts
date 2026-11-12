import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// Separate tables enforce email/username uniqueness within each realm.
function realm(prefix: string) {
  const user = pgTable(`${prefix}_auth_user`, {
    id: text().primaryKey(), name: text().notNull(), email: text().notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(), image: text(),
    username: text().notNull().unique(), displayUsername: text('display_username'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  });
  const session = pgTable(`${prefix}_auth_session`, {
    id: text().primaryKey(), token: text().notNull().unique(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'), userAgent: text('user_agent'),
  }, t => [index(`${prefix}_session_user_idx`).on(t.userId)]);
  const account = pgTable(`${prefix}_auth_account`, {
    id: text().primaryKey(), accountId: text('account_id').notNull(), providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'), refreshToken: text('refresh_token'), idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text(), password: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  }, t => [index(`${prefix}_account_user_idx`).on(t.userId)]);
  const verification = pgTable(`${prefix}_auth_verification`, {
    id: text().primaryKey(), identifier: text().notNull(), value: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  });
  return { user, session, account, verification };
}
export const memberAuth = realm('member');
export const staffAuth = realm('staff');
export const memberAuthUser = memberAuth.user;
export const memberAuthSession = memberAuth.session;
export const memberAuthAccount = memberAuth.account;
export const memberAuthVerification = memberAuth.verification;
export const staffAuthUser = staffAuth.user;
export const staffAuthSession = staffAuth.session;
export const staffAuthAccount = staffAuth.account;
export const staffAuthVerification = staffAuth.verification;
