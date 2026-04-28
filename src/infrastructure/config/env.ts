export interface AppEnv {
  port: number;
  nodeEnv: string;
  sendgridApiKey: string;
  awsRegion: string | undefined;
  brevoApiKey: string;
  databaseUrl: string;
  dbPoolMax: number;
  dbIdleTimeoutMs: number;
  dbConnectionTimeoutMs: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigin: string;
  shutdownTimeoutMs: number;
  payloadLimit: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  return parsed;
}

export function loadEnv(): AppEnv {
  return {
    port: optionalInt('PORT', 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    sendgridApiKey: requireEnv('SENDGRID_API_KEY'),
    awsRegion: process.env.AWS_REGION,
    brevoApiKey: requireEnv('BREVO_API_KEY'),
    databaseUrl: requireEnv('DATABASE_URL'),
    dbPoolMax: optionalInt('DB_POOL_MAX', 10),
    dbIdleTimeoutMs: optionalInt('DB_IDLE_TIMEOUT_MS', 30_000),
    dbConnectionTimeoutMs: optionalInt('DB_CONNECTION_TIMEOUT_MS', 2_000),
    rateLimitWindowMs: optionalInt('RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMax: optionalInt('RATE_LIMIT_MAX', 20),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    shutdownTimeoutMs: optionalInt('SHUTDOWN_TIMEOUT_MS', 30_000),
    payloadLimit: process.env.PAYLOAD_LIMIT ?? '256kb',
  };
}
