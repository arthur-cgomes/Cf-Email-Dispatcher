import sgMail from '@sendgrid/mail';
import { IEmailProvider } from '../../application/ports/IEmailProvider';
import { Email } from '../../domain/entities/Email';
import { ProviderError } from '../../domain/errors/ProviderError';
import { toErrorMessage } from '../utils/toErrorMessage';

export class SendGridProvider implements IEmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(email: Email): Promise<void> {
    try {
      await sgMail.send({
        to: email.to,
        from: email.from,
        subject: email.subject,
        html: email.body,
      });
    } catch (err) {
      console.error('[SendGridProvider] Send failed:', toErrorMessage(err));
      throw new ProviderError('sendgrid', 'Failed to send email via SendGrid');
    }
  }
}
