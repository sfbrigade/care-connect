import PgBoss from 'pg-boss';

export function createBoss () {
  return new PgBoss({
    connectionString: process.env.DATABASE_URL,
  });
}
