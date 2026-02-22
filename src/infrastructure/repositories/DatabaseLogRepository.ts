import { Pool } from 'pg';
import { ILogRepository } from '../../application/ports/ILogRepository';
import { LogRecord } from '../../domain/entities/LogRecord';
import { toErrorMessage } from '../utils/toErrorMessage';

export class DatabaseLogRepository implements ILogRepository {
  constructor(private readonly pool: Pool) {}

  async save(record: LogRecord): Promise<void> {
    const sql = `
      INSERT INTO email_logs (id, provider, recipient_email, status, error_reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      record.id,
      record.provider,
      record.recipientEmail,
      record.status,
      record.errorReason,
      record.createdAt,
    ];

    try {
      await this.pool.query(sql, values);
    } catch (err) {
      console.error('[DatabaseLogRepository] Failed to save log record:', toErrorMessage(err));
    }
  }
}
