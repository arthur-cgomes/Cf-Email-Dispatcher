import isEmail from 'validator/lib/isEmail';
import { ValidationError } from '../errors/ValidationError';

export interface EmailProps {
  to: string;
  from: string;
  subject: string;
  body: string;
}

export class Email {
  public readonly to: string;
  public readonly from: string;
  public readonly subject: string;
  public readonly body: string;

  private constructor(props: EmailProps) {
    this.to = props.to;
    this.from = props.from;
    this.subject = props.subject;
    this.body = props.body;
  }

  public static create(props: EmailProps): Email {
    const errors: Record<string, string[]> = {};

    if (!props.to || !isEmail(props.to)) {
      errors['to'] = ['Must be a valid email address'];
    }
    if (!props.from || !isEmail(props.from)) {
      errors['from'] = ['Must be a valid email address'];
    }
    if (!props.subject || props.subject.trim().length === 0) {
      errors['subject'] = ['Subject cannot be empty'];
    } else if (props.subject.length > 255) {
      errors['subject'] = ['Subject cannot exceed 255 characters'];
    }
    if (!props.body || props.body.trim().length === 0) {
      errors['body'] = ['Body cannot be empty'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Email validation failed', errors);
    }

    return new Email(props);
  }
}
