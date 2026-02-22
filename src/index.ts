import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

import { loadEnv } from './infrastructure/config/env';
import { buildRouter } from './infrastructure/http/router';
import { closePgPool } from './infrastructure/database/pgClient';

const env = loadEnv();

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: env.payloadLimit }));

app.use((req: Request, _res: Response, next: NextFunction): void => {
  const existing = req.headers['x-request-id'];
  req.headers['x-request-id'] = Array.isArray(existing) ? existing[0] : existing ?? uuidv4();
  next();
});

app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/', buildRouter(env));

const server = app.listen(env.port, () => {
  console.log(`[Server] 📧 cf-send-email listening on port: ${env.port}`);
});

const shutdown = async (): Promise<void> => {
  console.log('[Server] Shutting down gracefully...');

  const forceExit = setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, env.shutdownTimeoutMs);

  server.close(async () => {
    clearTimeout(forceExit);
    await closePgPool();
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
