import { DatabaseLogRepository } from '../../src/infrastructure/repositories/DatabaseLogRepository';
import { LogRecord } from '../../src/domain/entities/LogRecord';

const mockQuery = jest.fn();
const mockPool = { query: mockQuery } as never;

function makeRecord(overrides: Partial<ConstructorParameters<typeof LogRecord>[0]> = {}): LogRecord {
  return new LogRecord({
    id: 'test-uuid-1234',
    provider: 'sendgrid',
    recipientEmail: 'user@example.com',
    status: 'SUCCESS',
    errorReason: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });
}

describe('DatabaseLogRepository', () => {
  let repository: DatabaseLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DatabaseLogRepository(mockPool);
  });

  describe('save()', () => {
    it('executes INSERT query with correct parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const record = makeRecord();

      await repository.save(record);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, values] = (mockQuery as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO email_logs');
      expect(values).toEqual([
        record.id,
        record.provider,
        record.recipientEmail,
        record.status,
        record.errorReason,
        record.createdAt,
      ]);
    });

    it('passes all six values in correct order', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const record = makeRecord({ status: 'ERROR', errorReason: 'Send failed' });

      await repository.save(record);

      const [, values] = (mockQuery as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(values[3]).toBe('ERROR');
      expect(values[4]).toBe('Send failed');
    });

    it('does NOT throw when pool.query rejects (non-fatal log failure)', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.save(makeRecord())).resolves.toBeUndefined();
    });

    it('swallows non-Error rejections from the pool gracefully', async () => {
      mockQuery.mockRejectedValueOnce('string error');

      await expect(repository.save(makeRecord())).resolves.toBeUndefined();
    });

    it('inserts NULL for errorReason on SUCCESS records', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const record = makeRecord({ status: 'SUCCESS', errorReason: null });

      await repository.save(record);

      const [, values] = (mockQuery as jest.Mock).mock.calls[0] as [string, unknown[]];
      expect(values[4]).toBeNull();
    });
  });
});
