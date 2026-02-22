import { SendEmailUseCase } from '../../src/application/use-cases/SendEmailUseCase';
import { ValidationError } from '../../src/domain/errors/ValidationError';
import { ProviderError } from '../../src/domain/errors/ProviderError';
import { MockEmailProvider } from './mocks/MockEmailProvider';
import { MockLogRepository } from './mocks/MockLogRepository';

jest.useFakeTimers();

const validInput = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Test Subject',
  body: '<p>Hello World</p>',
};

describe('SendEmailUseCase', () => {
  let provider: MockEmailProvider;
  let logRepo: MockLogRepository;
  let useCase: SendEmailUseCase;

  beforeEach(() => {
    provider = new MockEmailProvider();
    logRepo = new MockLogRepository();
    useCase = new SendEmailUseCase(provider, logRepo, 'sendgrid');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('success flow', () => {
    it('calls provider.send() with a valid Email entity', async () => {
      await useCase.execute(validInput);
      expect(provider.sendCalled).toBe(true);
      expect(provider.lastEmail?.to).toBe(validInput.to);
      expect(provider.lastEmail?.from).toBe(validInput.from);
      expect(provider.lastEmail?.subject).toBe(validInput.subject);
      expect(provider.lastEmail?.body).toBe(validInput.body);
    });

    it('saves exactly one SUCCESS log record after successful send', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords).toHaveLength(1);
    });

    it('log record has status SUCCESS', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].status).toBe('SUCCESS');
    });

    it('log record has correct provider name', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].provider).toBe('sendgrid');
    });

    it('log record has correct recipient email', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].recipientEmail).toBe(validInput.to);
    });

    it('log record has null errorReason on success', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].errorReason).toBeNull();
    });

    it('log record has a valid UUID v4', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('log record has a createdAt Date', async () => {
      await useCase.execute(validInput);
      expect(logRepo.savedRecords[0].createdAt).toBeInstanceOf(Date);
    });

    it('resolves without throwing', async () => {
      await expect(useCase.execute(validInput)).resolves.toBeUndefined();
    });

    it('propagates when logRepository.save throws on success record', async () => {
      logRepo.shouldThrowOnCall = 1;
      await expect(useCase.execute(validInput)).rejects.toThrow('DB unavailable');
    });
  });

  describe('provider failure flow', () => {
    beforeEach(() => {
      provider.shouldThrow = new ProviderError('sendgrid', 'API rate limit exceeded');
      provider.alwaysThrow = true;
    });

    it('saves exactly one ERROR log record when provider throws after all retries', async () => {
      const promise = useCase.execute(validInput);
      const assertion = expect(promise).rejects.toThrow();
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(logRepo.savedRecords).toHaveLength(1);
      expect(logRepo.savedRecords[0].status).toBe('ERROR');
    });

    it('error log record contains the provider error message', async () => {
      const promise = useCase.execute(validInput);
      const assertion = expect(promise).rejects.toThrow();
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(logRepo.savedRecords[0].errorReason).toContain('API rate limit exceeded');
    });

    it('re-throws ProviderError so the controller can respond with 500', async () => {
      const promise = useCase.execute(validInput);
      const assertion = expect(promise).rejects.toBeInstanceOf(ProviderError);
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
    });

    it('wraps unknown provider errors in a new ProviderError', async () => {
      provider.shouldThrow = new Error('Unexpected network failure');
      const promise = useCase.execute(validInput);
      const assertion = expect(promise).rejects.toBeInstanceOf(ProviderError);
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
    });

    it('does NOT save an error record if logRepository.save also throws', async () => {
      logRepo.shouldThrow = true;
      const promise = useCase.execute(validInput);
      const assertion = expect(promise).rejects.toThrow();
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(logRepo.savedRecords).toHaveLength(0);
    });

    it('retries and succeeds when provider fails on 1st attempt only', async () => {
      provider.alwaysThrow = false;
      provider.failCount = 1;
      const promise = useCase.execute(validInput);
      await jest.advanceTimersByTimeAsync(2_000);
      await promise;
      expect(logRepo.savedRecords).toHaveLength(1);
      expect(logRepo.savedRecords[0].status).toBe('SUCCESS');
    });
  });

  describe('validation error flow (Zod layer)', () => {
    it('throws ValidationError for invalid "to" email', async () => {
      await expect(
        useCase.execute({ ...validInput, to: 'not-an-email' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid "from" email', async () => {
      await expect(
        useCase.execute({ ...validInput, from: 'bad' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for empty subject', async () => {
      await expect(
        useCase.execute({ ...validInput, subject: '' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for empty body', async () => {
      await expect(
        useCase.execute({ ...validInput, body: '' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('does NOT call provider.send() when validation fails', async () => {
      await expect(
        useCase.execute({ ...validInput, to: 'invalid' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(provider.sendCalled).toBe(false);
    });

    it('does NOT save any log record when validation fails', async () => {
      await expect(
        useCase.execute({ ...validInput, subject: '' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(logRepo.savedRecords).toHaveLength(0);
    });

    it('throws ValidationError for completely missing required fields', async () => {
      await expect(
        useCase.execute({ to: 'a@b.com', from: 'c@d.com' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for non-object input', async () => {
      await expect(useCase.execute('invalid-string')).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for null input', async () => {
      await expect(useCase.execute(null)).rejects.toBeInstanceOf(ValidationError);
    });


    it('ValidationError contains fieldErrors with the invalid field', async () => {
      try {
        await useCase.execute({ ...validInput, to: 'bad' });
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).fieldErrors).toHaveProperty('to');
      }
    });
  });

  describe('provider name propagation', () => {
    it('uses the injected provider name in SUCCESS log', async () => {
      const awsUseCase = new SendEmailUseCase(provider, logRepo, 'aws');
      await awsUseCase.execute(validInput);
      expect(logRepo.savedRecords[0].provider).toBe('aws');
    });

    it('uses the injected provider name in ERROR log', async () => {
      provider.shouldThrow = new ProviderError('brevo', 'Connection timeout');
      provider.alwaysThrow = true;
      const brevoUseCase = new SendEmailUseCase(provider, logRepo, 'brevo');
      const promise = brevoUseCase.execute(validInput);
      const assertion = expect(promise).rejects.toThrow();
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(logRepo.savedRecords[0].provider).toBe('brevo');
    });
  });
});
