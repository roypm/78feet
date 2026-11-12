import assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@78feet/db/schema';
import type pg from 'pg';
import { fixtureIds } from './seed.ts';
import type { Database } from '@78feet/db/connection';
import { listMembersPage } from './queries.ts';

export async function verifyQueryPlans(pool: pg.Pool, db: Database) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO member_auth_user(id,name,email,username,created_at,updated_at) SELECT 'perf-'||n,'Performance','perf-'||n||'@example.org','perf-'||n,now(),now() FROM generate_series(1,500) n");
    await client.query(`INSERT INTO "user"(id,auth_realm,auth_user_id,role,status,first_name,last_name,updated_at,payment_box_id) SELECT gen_random_uuid(),'member','perf-'||n,'member','active','Persona',lpad(n::text,4,'0'),now(),$1 FROM generate_series(1,500) n`,[fixtureIds.box]);
    await client.query('INSERT INTO membership(user_id,tariff_id,started_at) SELECT id,$1,now() FROM "user" WHERE auth_user_id LIKE \'perf-%\'',[fixtureIds.tariff]);
    await client.query(`INSERT INTO booking(instance_id,user_id,pool,status,created_by,quota_returned) SELECT i.id,u.id,'quota_directed','cancelled',u.id,false FROM "user" u CROSS JOIN class_instance i WHERE u.auth_user_id LIKE 'perf-%'`);
    await client.query('ANALYZE "user"; ANALYZE booking; ANALYZE class_instance; ANALYZE membership');
    const fixtureDb = drizzle(client,{schema});
    const lastPage = await listMembersPage(fixtureDb,'active',999,'apellidos-desc');
    assert.equal(lastPage.pageInfo.total,503);
    assert.equal(lastPage.pageInfo.page,lastPage.pageInfo.totalPages);
    const firstPage = await listMembersPage(fixtureDb,'active',1,'apellidos-desc');
    assert.equal(firstPage.items.length,25);
    assert.notDeepEqual(firstPage.items,lastPage.items);
    const person = (await client.query(`SELECT id FROM "user" WHERE auth_user_id='perf-250'`)).rows[0].id;
    const counts = (await client.query('SELECT (SELECT count(*) FROM "user") people,(SELECT count(*) FROM booking) bookings')).rows[0];
    const queries: [string,string,unknown[]][] = [
      ['calendar',`SELECT i.id,(SELECT count(*) FROM booking b WHERE b.instance_id=i.id AND b.status='active') FROM class_instance i WHERE i.box_id=$1 AND i.date BETWEEN '2026-11-12' AND '2026-12-06' ORDER BY i.date,i.start_at`,[fixtureIds.box]],
      ['consumption',`SELECT count(*) FILTER(WHERE b.pool='quota_directed'),count(*) FILTER(WHERE b.pool='pack') FROM booking b JOIN class_instance i ON i.id=b.instance_id WHERE b.user_id=$1 AND (b.status='active' OR b.quota_returned=false) AND i.date BETWEEN '2026-11-09' AND '2026-11-15'`,[person]],
      ['unpaid',`SELECT u.id FROM "user" u JOIN membership m ON m.user_id=u.id AND m.ended_at IS NULL JOIN tariff t ON t.id=m.tariff_id WHERE u.role='member' AND u.status='active' AND t.billing_period='monthly' AND NOT EXISTS(SELECT 1 FROM payment p WHERE p.user_id=u.id AND p.billing_period='monthly' AND p.period_start='2026-11-01') ORDER BY u.last_name,u.first_name,u.id LIMIT 25`,[]],
    ];
    for (const [name,query,args] of queries) {
      const explained = (await client.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${query}`,args)).rows[0]['QUERY PLAN'][0];
      assert.ok(Number.isFinite(explained['Execution Time']));
      console.log(`PLAN ${name}: dataset=${JSON.stringify(counts)}, executionMs=${explained['Execution Time']}, root=${explained.Plan['Node Type']}, rows=${explained.Plan['Actual Rows']}`);
    }
  } finally { await client.query('ROLLBACK'); client.release(); }
  // Page requests clamp to the last page and sorting happens in SQL. The larger
  // fixture above is rollback-only; no performance rows leak into the seed.
  const page = await listMembersPage(db,'active',999);
  assert.equal(page.pageInfo.page,page.pageInfo.totalPages);
}
