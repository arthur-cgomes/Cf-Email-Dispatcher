import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { getPgPool } from '../database/pgClient';
import { DatabaseLogRepository } from '../repositories/DatabaseLogRepository';
import { SendGridProvider } from '../providers/SendGridProvider';
import { AwsSesProvider } from '../providers/AwsSesProvider';
import { BrevoProvider } from '../providers/BrevoProvider';
import { SendEmailUseCase } from '../../application/use-cases/SendEmailUseCase';
import { EmailController } from '../../presentation/EmailController';
import { AppEnv } from '../config/env';

export function buildRouter(env: AppEnv): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  router.use(limiter);

  const pool = getPgPool({
    connectionString: env.databaseUrl,
    max: env.dbPoolMax,
    idleTimeoutMillis: env.dbIdleTimeoutMs,
    connectionTimeoutMillis: env.dbConnectionTimeoutMs,
  });
  const logRepository = new DatabaseLogRepository(pool);

  const sendGridProvider = new SendGridProvider(env.sendgridApiKey);
  const sendGridUseCase = new SendEmailUseCase(sendGridProvider, logRepository, 'sendgrid');
  const sendGridController = new EmailController(sendGridUseCase);

  const awsSesProvider = new AwsSesProvider(env.awsRegion);
  const awsUseCase = new SendEmailUseCase(awsSesProvider, logRepository, 'aws');
  const awsController = new EmailController(awsUseCase);

  const brevoProvider = new BrevoProvider(env.brevoApiKey);
  const brevoUseCase = new SendEmailUseCase(brevoProvider, logRepository, 'brevo');
  const brevoController = new EmailController(brevoUseCase);

  router.post('/send/sendgrid', (req, res) => sendGridController.handle(req, res));
  router.post('/send/aws', (req, res) => awsController.handle(req, res));
  router.post('/send/brevo', (req, res) => brevoController.handle(req, res));

  return router;
}
