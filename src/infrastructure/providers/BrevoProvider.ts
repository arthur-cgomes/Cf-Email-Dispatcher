import {
  TransactionalEmailsApi,
  SendSmtpEmail,
  TransactionalEmailsApiApiKeys,
} from '@getbrevo/brevo';
import { IEmailProvider } from '../../application/ports/IEmailProvider';
import { Email } from '../../domain/entities/Email';
import { ProviderError } from '../../domain/errors/ProviderError';
import { toErrorMessage } from '../utils/toErrorMessage';

export class BrevoProvider implements IEmailProvider {
  private readonly apiInstance: TransactionalEmailsApi;

  constructor(apiKey: string) {
    this.apiInstance = new TransactionalEmailsApi();
    this.apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  async send(email: Email): Promise<void> {
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email.to }];
    sendSmtpEmail.sender = { email: email.from };
    sendSmtpEmail.subject = email.subject;
    sendSmtpEmail.htmlContent = email.body;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (err) {
      console.error('[BrevoProvider] Send failed:', toErrorMessage(err));
      throw new ProviderError('brevo', 'Failed to send email via Brevo');
    }
  }
}
