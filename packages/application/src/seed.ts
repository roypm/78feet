import { connect } from '@78feet/db/connection';
import { provisionAccount } from './identity.ts';
import { eq } from 'drizzle-orm';
import { box, classType, tariff, user } from '@78feet/db/schema';
export const fixtureIds = {
  box: '00000000-0000-4000-8000-000000000001',
  admin: '00000000-0000-4000-8000-000000000004',
  type: '00000000-0000-4000-8000-000000000002',
  tariff: '00000000-0000-4000-8000-000000000003',
};
export async function seed(db: ReturnType<typeof connect>['db'], admin?: { loginId: string; email: string; password: string }) {
  await db.transaction(async tx => {
    await tx.insert(box).values({ id: fixtureIds.box, name: 'Box local', slug: 'box-local', weeklyHours: Array.from({length:7}, (_,i)=>({weekday:i+1,intervals:[{openTime:'07:00',closeTime:'21:00'}]})), createdAt: new Date('2026-01-01T00:00:00Z') }).onConflictDoNothing();
    await tx.insert(classType).values({id:fixtureIds.type,name:'Dirigida',kind:'directed',slug:'dirigida'}).onConflictDoNothing();
    await tx.insert(tariff).values({id:fixtureIds.tariff,name:'Semanal local',priceCents:5000,consumptionModel:'weekly_quota',billingPeriod:'monthly',quotaDirected:2,quotaOpen:0,createdAt:new Date('2026-01-01T00:00:00Z')}).onConflictDoNothing();
  });
  if (admin && !(await db.select({ id: user.id }).from(user).where(eq(user.id, fixtureIds.admin)))[0]) {
    await provisionAccount(db, { id: fixtureIds.admin, role: 'admin', firstName: 'Admin', lastName: 'Local', boxId: fixtureIds.box, ...admin });
  }
}
if (process.argv[1]?.endsWith('/seed.ts')) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost','127.0.0.1','db','db-test'].includes(url.hostname) || !['/feet_dev','/feet_test'].includes(url.pathname)) throw new Error('Seed restricted to explicit local feet_dev/feet_test');
  const c = connect(url.toString());
  try {
    const loginId = process.env.ADMIN_LOGIN_ID;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!loginId || !email || !password) throw new Error('ADMIN_LOGIN_ID, ADMIN_EMAIL and ADMIN_PASSWORD are required');
    await seed(c.db, { loginId, email, password });
  } finally { await c.close(); }
}
