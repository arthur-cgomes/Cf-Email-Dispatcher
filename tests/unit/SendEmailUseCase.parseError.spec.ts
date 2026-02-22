import { MockEmailProvider } from './mocks/MockEmailProvider';
import { MockLogRepository } from './mocks/MockLogRepository';

const unexpectedError = new TypeError('Unexpected parse failure');

jest.mock('../../src/application/dtos/SendEmailDTO', () => ({
  sendEmailSchema: {
    parse: () => { throw unexpectedError; },
  },
}));

import { SendEmailUseCase } from '../../src/application/use-cases/SendEmailUseCase';

describe('SendEmailUseCase — non-ZodError from schema.parse', () => {
  it('re-throws the error as-is when schema.parse throws a non-ZodError', async () => {
    const useCase = new SendEmailUseCase(
      new MockEmailProvider(),
      new MockLogRepository(),
      'sendgrid',
    );
    await expect(useCase.execute({})).rejects.toThrow(unexpectedError);
  });
});
