import { EmailController } from '../../src/presentation/EmailController';
import { SendEmailUseCase } from '../../src/application/use-cases/SendEmailUseCase';
import { ValidationError } from '../../src/domain/errors/ValidationError';
import { ProviderError } from '../../src/domain/errors/ProviderError';

const mockExecute = jest.fn();

jest.mock('../../src/application/use-cases/SendEmailUseCase', () => ({
  SendEmailUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

function buildMockReqRes(body: unknown = {}) {
  const req = { body } as never;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as never;
  return { req, res, json, status };
}

describe('EmailController', () => {
  let controller: EmailController;

  beforeEach(() => {
    jest.clearAllMocks();
    const useCase = new (SendEmailUseCase as jest.MockedClass<typeof SendEmailUseCase>)(
      {} as never,
      {} as never,
      'sendgrid',
    );
    controller = new EmailController(useCase);
  });

  describe('handle() — success', () => {
    it('responds 200 with success message when use case resolves', async () => {
      mockExecute.mockResolvedValueOnce(undefined);
      const { req, res, status, json } = buildMockReqRes({ to: 'a@b.com' });

      await controller.handle(req, res);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ message: 'Email sent successfully' });
    });
  });

  describe('handle() — ValidationError', () => {
    it('responds 400 with error message and fieldErrors', async () => {
      const err = new ValidationError('Request validation failed', {
        to: ['Invalid recipient email address'],
      });
      mockExecute.mockRejectedValueOnce(err);
      const { req, res, status, json } = buildMockReqRes();

      await controller.handle(req, res);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Request validation failed',
        fieldErrors: { to: ['Invalid recipient email address'] },
      });
    });
  });

  describe('handle() — ProviderError', () => {
    it('responds 500 with sanitized provider error message', async () => {
      const err = new ProviderError('sendgrid', 'Failed to send email via SendGrid');
      mockExecute.mockRejectedValueOnce(err);
      const { req, res, json } = buildMockReqRes();

      await controller.handle(req, res);

      expect(json).toHaveBeenCalledWith({ error: '[sendgrid] Failed to send email via SendGrid' });
    });

    it('does not expose raw SDK errors to the client', async () => {
      const err = new ProviderError('aws', 'Failed to send email via AWS SES');
      mockExecute.mockRejectedValueOnce(err);
      const { req, res, json } = buildMockReqRes();

      await controller.handle(req, res);

      const body = (json as jest.Mock).mock.calls[0][0] as { error: string };
      expect(body.error).not.toContain('AccessKey');
      expect(body.error).not.toContain('Secret');
    });
  });

  describe('handle() — unexpected error', () => {
    it('responds 500 with generic message for unknown errors', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Something totally unexpected'));
      const { req, res, status, json } = buildMockReqRes();

      await controller.handle(req, res);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('does not expose the unexpected error message to the client', async () => {
      mockExecute.mockRejectedValueOnce(new Error('DB password is abc123'));
      const { req, res, json } = buildMockReqRes();

      await controller.handle(req, res);

      const body = (json as jest.Mock).mock.calls[0][0] as { error: string };
      expect(body.error).toBe('Internal server error');
    });
  });
});
