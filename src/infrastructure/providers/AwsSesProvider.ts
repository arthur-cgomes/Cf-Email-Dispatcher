import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { IEmailProvider } from '../../application/ports/IEmailProvider';
import { Email } from '../../domain/entities/Email';
import { ProviderError } from '../../domain/errors/ProviderError';
import { toErrorMessage } from '../utils/toErrorMessage';

export class AwsSesProvider implements IEmailProvider {
  private readonly client: SESClient;

  constructor(region: string) {
    this.client = new SESClient({ region });
  }

  async send(email: Email): Promise<void> {
    const command = new SendEmailCommand({
      Source: email.from,
      Destination: { ToAddresses: [email.to] },
      Message: {
        Subject: { Data: email.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: email.body, Charset: 'UTF-8' },
        },
      },
    });

    try {
      await this.client.send(command);
    } catch (err) {
      console.error('[AwsSesProvider] Send failed:', toErrorMessage(err));
      throw new ProviderError('aws', 'Failed to send email via AWS SES');
    }
  }
}
