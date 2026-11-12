import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import type pg from 'pg';

// Rebuild the actual historical SQL in a temporary schema, never another DB.
// This compares the final PostgreSQL catalogs rather than inferring constraints
// from Prisma models (which omit partial indexes and custom checks).
export async function compareLegacyCatalog(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA r3_reference; SET LOCAL search_path TO r3_reference, public');
    const directory = new URL('../../../apps/web/prisma/migrations/',import.meta.url);
    for (const name of (await readdir(directory)).filter(n=>/^\d/.test(n)).sort()) {
      await client.query(await readFile(new URL(`${name}/migration.sql`,directory),'utf8'));
    }
    const oldColumns = new Set(['login_id','password_hash','token_version','email']);
    const newColumns = new Set(['auth_realm','auth_user_id','member_auth_id','staff_auth_id']);
    const columns = async (schema: string) => (await client.query(`SELECT table_name,column_name,is_nullable,data_type,udt_name,column_default FROM information_schema.columns WHERE table_schema=$1 ORDER BY table_name,ordinal_position`,[schema])).rows.filter(r=>!r.table_name.includes('_auth_') && !(r.table_name==='user' && (oldColumns.has(r.column_name)||newColumns.has(r.column_name)))).map(r=>({ ...r, column_default:r.column_name === 'id' && r.data_type === 'uuid' && [null,'gen_random_uuid()'].includes(r.column_default) ? 'generated UUID (Prisma client / PostgreSQL)' : r.column_default?.replaceAll('r3_reference.','').replaceAll('public.','') })).sort((a,b)=>`${a.table_name}.${a.column_name}`.localeCompare(`${b.table_name}.${b.column_name}`));
    assert.deepEqual(await columns('public'),await columns('r3_reference'),'business columns preserve SQL type/nullability/default');
    const constraints = async (schema: string) => (await client.query(`SELECT t.relname AS table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 ORDER BY t.relname,c.conname`,[schema])).rows.filter(r=>!r.table_name.includes('_auth_') && !['user_auth_role','user_member_auth_id_member_auth_user_id_fk','user_staff_auth_id_staff_auth_user_id_fk'].includes(r.conname)).map(r=>({ ...r, definition:r.definition.replaceAll('r3_reference.','').replaceAll('public.','') }));
    // Column-level unique constraints are represented as unique indexes by
    // Drizzle; compare uniqueness below, while comparing FK/check/PK here.
    const relational = (rows: Awaited<ReturnType<typeof constraints>>) => rows.filter(r=>r.contype!=='u');
    assert.deepEqual(relational(await constraints('public')),relational(await constraints('r3_reference')),'FK actions, checks and primary keys match historical SQL');
    const indexes = async (schema: string) => (await client.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=$1 ORDER BY tablename,indexname`,[schema])).rows.filter(r=>!r.tablename.includes('_auth_') && !['user_login_id_key','user_auth_identity'].includes(r.indexname)).map(r=>({ ...r,indexdef:r.indexdef.replaceAll('r3_reference.','').replaceAll('public.','') }));
    assert.deepEqual(await indexes('public'),await indexes('r3_reference'),'indexes and partial predicates match historical SQL');
    console.log('PASS: all legacy migrations rebuilt in rollback-only schema; business catalog comparison');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}
