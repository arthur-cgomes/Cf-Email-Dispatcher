import { LogRecord } from '../../domain/entities/LogRecord';

export interface ILogRepository {
  save(record: LogRecord): Promise<void>;
}
