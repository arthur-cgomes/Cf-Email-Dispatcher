import { Email } from '../../domain/entities/Email';

export interface IEmailProvider {
  send(email: Email): Promise<void>;
}
