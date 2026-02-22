import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import { Email } from '../../domain/entities/Email';
import { LogRecord, EmailProvider } from '../../domain/entities/LogRecord';
import { ValidationError } from '../../domain/errors/ValidationError';
import { ProviderError } from '../../domain/errors/ProviderError';
import { IEmailProvider } from '../ports/IEmailProvider';
import { ILogRepository } from '../ports/ILogRepository';
import { SendEmailDTO, sendEmailSchema } from '../dtos/SendEmailDTO';

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

export class SendEmailUseCase {
  constructor(
    private readonly emailProvider: IEmailProvider,
    private readonly logRepository: ILogRepository,
    private readonly providerName: EmailProvider,
  ) {}

  async execute(input: unknown): Promise<void> {
    let dto: SendEmailDTO;
    try {
      dto = sendEmailSchema.parse(input);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const field = issue.path.join('.') || 'unknown';
          fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
        }
        throw new ValidationError('Request validation failed', fieldErrors);
      }
      throw err;
    }

    const email = Email.create({
      to: dto.to,
      from: dto.from,
      subject: dto.subject,
      body: dto.body,
    });

    try {
      await this.sendWithRetry(email);
    } catch (err) {
      const errorRecord = new LogRecord({
        id: uuidv4(),
        provider: this.providerName,
        recipientEmail: email.to,
        status: 'ERROR',
        errorReason: err instanceof ProviderError ? err.message : 'Unknown provider error',
        createdAt: new Date(),
      });
      await this.logRepository.save(errorRecord);

      if (err instanceof ProviderError) throw err;
      throw new ProviderError(this.providerName, 'Unexpected failure during send');
    }

    const successRecord = new LogRecord({
      id: uuidv4(),
      provider: this.providerName,
      recipientEmail: email.to,
      status: 'SUCCESS',
      errorReason: null,
      createdAt: new Date(),
    });
    await this.logRepository.save(successRecord);
  }

  private async sendWithRetry(email: Email): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        await this.emailProvider.send(email);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < RETRY_DELAYS_MS.length) {
          await this.sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
