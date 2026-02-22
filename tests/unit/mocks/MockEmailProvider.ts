import { IEmailProvider } from '../../../src/application/ports/IEmailProvider';
import { Email } from '../../../src/domain/entities/Email';

export class MockEmailProvider implements IEmailProvider {
  public sendCalled = false;
  public lastEmail: Email | null = null;
  public shouldThrow: Error | null = null;
  public alwaysThrow = false;
  public failCount = 0;
  private callCount = 0;

  async send(email: Email): Promise<void> {
    this.sendCalled = true;
    this.lastEmail = email;
    this.callCount++;

    if (this.alwaysThrow && this.shouldThrow) throw this.shouldThrow;
    if (this.failCount > 0 && this.callCount <= this.failCount && this.shouldThrow) {
      throw this.shouldThrow;
    }
  }

  reset(): void {
    this.sendCalled = false;
    this.lastEmail = null;
    this.shouldThrow = null;
    this.alwaysThrow = false;
    this.failCount = 0;
    this.callCount = 0;
  }
}
