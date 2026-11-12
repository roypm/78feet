import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { DomainError, atBoxTime, horizonRange, localDateString, quotaPeriodForConsumption, quotaPeriodStartDate, quotaPeriodEndDate, isSubscriptionBilling, periodStartForDate, subscriptionPeriodLabel, type Role } from '@78feet/domain';
import type { Database, Transaction } from '@78feet/db/connection';
import { user, membership, tariff } from '@78feet/db/schema';
import { memberConsumption } from './consumption.ts';

type Reader = Database | Transaction;
const personOrders: Record<string, SQL> = {
  'apellidos-asc': sql`u.last_name ASC,u.first_name ASC,u.id ASC`,
  'apellidos-desc': sql`u.last_name DESC,u.first_name DESC,u.id ASC`,
  'nombre-asc': sql`u.first_name ASC,u.last_name ASC,u.id ASC`,
  'nombre-desc': sql`u.first_name DESC,u.last_name DESC,u.id ASC`,
};
async function page<T extends Record<string, unknown>>(db: Reader, source: SQL, order: SQL, requested = 1) {
  const count = await db.execute<{ total: number }>(sql`SELECT count(*)::int total FROM (${source}) q`);
  const total = count.rows[0].total;
  const totalPages = Math.max(1,Math.ceil(total / 25));
  const current = Math.min(Math.max(1,Number.isSafeInteger(requested) ? requested : 1),totalPages);
  const rows = total ? await db.execute<T>(sql`${source} ORDER BY ${order} LIMIT 25 OFFSET ${(current-1)*25}`) : { rows: [] as T[] };
  return { items: rows.rows, pageInfo: { page: current, pageSize: 25, total, totalPages } };
}
const imageProjection = sql`CASE WHEN img.updated_at IS NULL THEN NULL ELSE '/api/v1/profile-images/'||u.id||'?v='||floor(extract(epoch FROM img.updated_at)*1000)::text END`;
const personProjection = sql`u.id,u.role,u.status,u.first_name AS "firstName",u.last_name AS "lastName",u.dni,u.phone,coalesce(ma.username,sa.username) AS "loginId",coalesce(ma.email,sa.email) AS email,u.theme,u.preference_box_id AS "preferenceBoxId",u.payment_box_id AS "paymentBoxId",${imageProjection} AS "profileImageUrl"`;
const personJoins = sql`FROM "user" u LEFT JOIN member_auth_user ma ON ma.id=u.member_auth_id LEFT JOIN staff_auth_user sa ON sa.id=u.staff_auth_id LEFT JOIN user_profile_image img ON img.user_id=u.id`;
export async function getPerson(db: Reader, id: string, role?: Role) {
  const result = await db.execute(sql`SELECT ${personProjection} ${personJoins} WHERE u.id=${id}::uuid ${role ? sql`AND u.role=${role}` : sql``}`);
  if (!result.rows[0]) throw new DomainError('FORBIDDEN');
  return result.rows[0];
}
export async function listMembersPage(db: Reader, status: 'active'|'inactive'|'all' = 'active', requested = 1, order = 'apellidos-asc') {
  return page(db,sql`SELECT ${personProjection},t.name AS "tariffName",pb.name AS "paymentBoxName" ${personJoins} LEFT JOIN membership m ON m.user_id=u.id AND m.ended_at IS NULL LEFT JOIN tariff t ON t.id=m.tariff_id LEFT JOIN box pb ON pb.id=u.payment_box_id WHERE u.role='member' ${status === 'all' ? sql`` : sql`AND u.status=${status}`}`,personOrders[order] ?? personOrders['apellidos-asc'],requested);
}
export async function listStaff(db: Reader, filters: { role?: 'coach'|'admin'; status?: 'active'|'inactive'; order?: string } = {}) {
  return (await db.execute(sql`SELECT ${personProjection} ${personJoins} WHERE u.role IN ('coach','admin') ${filters.role ? sql`AND u.role=${filters.role}` : sql``} ${filters.status ? sql`AND u.status=${filters.status}` : sql``} ORDER BY ${personOrders[filters.order ?? ''] ?? sql`u.role ASC,u.last_name ASC,u.first_name ASC,u.id ASC`}`)).rows;
}
export async function listMemberOptions(db: Reader) { return (await db.execute(sql`SELECT id,first_name AS "firstName",last_name AS "lastName",dni FROM "user" WHERE role='member' AND status='active' ORDER BY last_name,first_name,id`)).rows; }
export async function listCoachOptions(db: Reader) { return (await db.execute(sql`SELECT id,first_name AS "firstName",last_name AS "lastName" FROM "user" WHERE role IN ('coach','admin') AND status='active' ORDER BY first_name,last_name,id`)).rows; }
export async function listTrainingOptions(db: Reader, typeId?: string) { return (await db.execute(sql`SELECT id,name,class_type_id AS "classTypeId" FROM training ${typeId ? sql`WHERE class_type_id=${typeId}::uuid` : sql``} ORDER BY name,id`)).rows; }
export async function listTrainingFilterTypes(db: Reader) { return (await db.execute(sql`SELECT t.id,t.name,t.slug,t.kind FROM class_type t WHERE t.kind='directed' AND EXISTS(SELECT 1 FROM training w WHERE w.class_type_id=t.id) ORDER BY t.name,t.id`)).rows; }
export async function listTrainingsPage(db: Reader, typeId?: string, requested = 1, order = 'recientes') {
  const orders: Record<string,SQL> = { recientes: sql`w.updated_at DESC,w.id ASC`, antiguos: sql`w.updated_at ASC,w.id ASC`, 'nombre-asc': sql`w.name ASC,w.id ASC`, 'nombre-desc': sql`w.name DESC,w.id ASC` };
  return page(db,sql`SELECT w.id,w.name,w.class_type_id AS "classTypeId",t.name AS "classTypeName" FROM training w JOIN class_type t ON t.id=w.class_type_id ${typeId ? sql`WHERE w.class_type_id=${typeId}::uuid` : sql``}`,orders[order] ?? orders.recientes,requested);
}
export async function listPaymentsPage(db: Reader, filters: { memberId?: string; boxId?: string; page?: number; order?: string } = {}) {
  const orders: Record<string,SQL> = { recientes: sql`p.created_at DESC,p.id DESC`, antiguos: sql`p.created_at ASC,p.id DESC`, 'importe-desc': sql`p.amount_cents DESC,p.created_at DESC,p.id DESC`, 'importe-asc': sql`p.amount_cents ASC,p.created_at DESC,p.id DESC` };
  const where = sql`WHERE true ${filters.memberId ? sql`AND p.user_id=${filters.memberId}::uuid` : sql``} ${filters.boxId ? sql`AND p.payment_box_id=${filters.boxId}::uuid` : sql``}`;
  const result = await page(db,sql`SELECT p.id,p.user_id AS "memberId",p.billing_period AS "billingPeriod",p.period_start AS "periodStart",p.amount_cents AS "amountCents",p.method,p.created_at AS "createdAt",u.first_name||' '||u.last_name AS "memberName",r.first_name||' '||r.last_name AS "recordedByName",b.name AS "paymentBoxName" FROM payment p JOIN "user" u ON u.id=p.user_id JOIN "user" r ON r.id=p.recorded_by JOIN box b ON b.id=p.payment_box_id ${where}`,orders[filters.order ?? ''] ?? orders.recientes,filters.page);
  const totals = await db.execute<{ count: number; amountCents: number }>(sql`SELECT count(*)::int count,coalesce(sum(p.amount_cents),0)::int AS "amountCents" FROM payment p ${where}`);
  return { ...result, totals: totals.rows[0] };
}
export async function listUnpaidPage(db: Reader, date = localDateString(new Date()), requested = 1, boxId?: string, order = 'apellidos-asc') {
  const periods = (['monthly','quarterly','semiannual','annual'] as const).map(b => sql`(t.billing_period=${b} AND NOT EXISTS(SELECT 1 FROM payment p WHERE p.user_id=u.id AND p.billing_period=${b} AND p.period_start=${periodStartForDate(date,b)}::date))`);
  const source = sql`SELECT u.id,u.first_name AS "firstName",u.last_name AS "lastName",u.dni,u.phone,t.name AS "tariffName",t.price_cents AS "priceCents",t.billing_period AS "billingPeriod" FROM "user" u JOIN membership m ON m.user_id=u.id AND m.ended_at IS NULL JOIN tariff t ON t.id=m.tariff_id WHERE u.role='member' AND u.status='active' ${boxId ? sql`AND u.payment_box_id=${boxId}::uuid` : sql``} AND (${sql.join(periods,sql` OR `)})`;
  const result = await page<{ id: string; billingPeriod: 'monthly'|'quarterly'|'semiannual'|'annual' }>(db,source,personOrders[order] ?? personOrders['apellidos-asc'],requested);
  return { ...result, asOf: date, items: result.items.map(r => { const periodStart = periodStartForDate(date,r.billingPeriod); return { ...r, periodStart, periodLabel: subscriptionPeriodLabel(r.billingPeriod,periodStart) }; }) };
}
export async function getMemberSummary(db: Reader, id: string, now = new Date()) {
  const today = localDateString(now);
  const [current] = await db.select({ tariff }).from(membership).innerJoin(tariff,eq(membership.tariffId,tariff.id)).where(and(eq(membership.userId,id),isNull(membership.endedAt)));
  const plan = current?.tariff ?? null;
  const period = plan ? quotaPeriodForConsumption(plan.consumptionModel) : null;
  const periodStart = period ? quotaPeriodStartDate(today,period) : null;
  const periodEnd = period ? quotaPeriodEndDate(today,period) : null;
  const consumption = await memberConsumption(db,id,today,period);
  const adjustments = period ? await db.execute<{ kind: string; delta: number }>(sql`SELECT kind,sum(delta)::int delta FROM quota_adjustment WHERE user_id=${id}::uuid AND period=${period} AND period_start=${periodStart}::date GROUP BY kind`) : { rows: [] };
  const rangeFormat = new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short'});
  const monthFormat = new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',month:'long',year:'numeric'});
  const label = periodStart && periodEnd ? period === 'month' ? monthFormat.format(atBoxTime(periodStart,'12:00')) : `${rangeFormat.format(atBoxTime(periodStart,'12:00'))} – ${rangeFormat.format(atBoxTime(periodEnd,'12:00'))}` : null;
  const quota = { period, periodStart, periodEnd, periodLabel: label, directedUsed: consumption.usedDirected, directedLimit: plan?.quotaDirected ?? null, directedAdjustment: adjustments.rows.find(a=>a.kind==='directed')?.delta ?? 0, openUsed: consumption.usedOpen, openLimit: plan?.quotaOpen ?? null, openAdjustment: adjustments.rows.find(a=>a.kind==='open')?.delta ?? 0, packBalance: consumption.packBalance };
  let payment: { status: 'paid'|'pending'; billingPeriod: string; periodStart: string; periodLabel: string } | null = null;
  if (plan && isSubscriptionBilling(plan.billingPeriod)) {
    const start = periodStartForDate(today,plan.billingPeriod);
    const paid = await db.execute(sql`SELECT 1 FROM payment WHERE user_id=${id}::uuid AND billing_period=${plan.billingPeriod} AND period_start=${start}::date LIMIT 1`);
    payment = { status: paid.rowCount ? 'paid' : 'pending', billingPeriod: plan.billingPeriod, periodStart: start, periodLabel: subscriptionPeriodLabel(plan.billingPeriod,start) };
  }
  return { tariff: plan ? { name: plan.name, consumptionModel: plan.consumptionModel, billingPeriod: plan.billingPeriod, priceCents: plan.priceCents, quotaDirected: plan.quotaDirected, quotaOpen: plan.quotaOpen } : null, quota, payment };
}
