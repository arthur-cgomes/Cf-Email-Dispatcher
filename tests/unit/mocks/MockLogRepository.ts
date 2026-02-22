import { ILogRepository } from '../../../src/application/ports/ILogRepository';
import { LogRecord } from '../../../src/domain/entities/LogRecord';

export class MockLogRepository implements ILogRepository {
  public savedRecords: LogRecord[] = [];
  public shouldThrow = false;
  public shouldThrowOnCall: number | null = null;
  private callCount = 0;

  async save(record: LogRecord): Promise<void> {
    this.callCount++;
    if (this.shouldThrow) throw new Error('DB unavailable');
    if (this.shouldThrowOnCall !== null && this.callCount === this.shouldThrowOnCall) {
      throw new Error('DB unavailable');
    }
    this.savedRecords.push(record);
  }

  reset(): void {
    this.savedRecords = [];
    this.shouldThrow = false;
    this.shouldThrowOnCall = null;
    this.callCount = 0;
  }
}
