import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connect } from './connection.ts';
const connection = connect(process.env.DATABASE_URL!);
try {
  // Serialize competing migration processes on this database only.
  const client = await connection.pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(783003)');
    await migrate(connection.db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  } finally {
    await client.query('SELECT pg_advisory_unlock(783003)');
    client.release();
  }
} finally { await connection.close(); }
