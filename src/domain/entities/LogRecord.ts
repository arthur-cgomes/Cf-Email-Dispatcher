export type EmailProvider = 'sendgrid' | 'aws' | 'brevo';
export type LogStatus = 'SUCCESS' | 'ERROR';

export interface LogRecordProps {
  id: string;
  provider: EmailProvider;
  recipientEmail: string;
  status: LogStatus;
  errorReason: string | null;
  createdAt: Date;
}

export class LogRecord {
  public readonly id: string;
  public readonly provider: EmailProvider;
  public readonly recipientEmail: string;
  public readonly status: LogStatus;
  public readonly errorReason: string | null;
  public readonly createdAt: Date;

  constructor(props: LogRecordProps) {
    this.id = props.id;
    this.provider = props.provider;
    this.recipientEmail = props.recipientEmail;
    this.status = props.status;
    this.errorReason = props.errorReason;
    this.createdAt = props.createdAt;
  }
}
