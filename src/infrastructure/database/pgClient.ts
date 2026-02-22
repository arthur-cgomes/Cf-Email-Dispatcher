import { Pool } from 'pg';

let pool: Pool | null = null;

export interface PgPoolConfig {
  connectionString: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export function getPgPool(config: PgPoolConfig): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.connectionString,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    });

    pool.on('error', (err) => {
      console.error('[PgPool] Unexpected client error:', err.message);
    });
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
