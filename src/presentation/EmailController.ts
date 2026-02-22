import { Request, Response } from 'express';
import { ValidationError } from '../domain/errors/ValidationError';
import { ProviderError } from '../domain/errors/ProviderError';
import { SendEmailUseCase } from '../application/use-cases/SendEmailUseCase';

export class EmailController {
  constructor(private readonly sendEmailUseCase: SendEmailUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      await this.sendEmailUseCase.execute(req.body);
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({
          error: err.message,
          fieldErrors: err.fieldErrors,
        });
        return;
      }

      if (err instanceof ProviderError) {
        res.status(500).json({ error: err.message });
        return;
      }

      console.error('[EmailController] Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
