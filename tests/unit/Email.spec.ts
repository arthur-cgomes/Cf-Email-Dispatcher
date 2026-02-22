import { Email } from '../../src/domain/entities/Email';
import { ValidationError } from '../../src/domain/errors/ValidationError';

describe('Email entity', () => {
  const valid = {
    to: 'user@example.com',
    from: 'sender@example.com',
    subject: 'Hello World',
    body: '<p>Email body content</p>',
  };

  describe('create() — valid input', () => {
    it('creates a valid Email instance with all fields', () => {
      const email = Email.create(valid);
      expect(email.to).toBe(valid.to);
      expect(email.from).toBe(valid.from);
      expect(email.subject).toBe(valid.subject);
      expect(email.body).toBe(valid.body);
    });
  });

  describe('create() — invalid "to"', () => {
    it('throws ValidationError for a non-email "to"', () => {
      expect(() => Email.create({ ...valid, to: 'not-an-email' })).toThrow(ValidationError);
    });

    it('throws ValidationError for empty "to"', () => {
      expect(() => Email.create({ ...valid, to: '' })).toThrow(ValidationError);
    });

    it('includes "to" key in fieldErrors', () => {
      try {
        Email.create({ ...valid, to: 'bad' });
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).fieldErrors).toHaveProperty('to');
      }
    });
  });

  describe('create() — invalid "from"', () => {
    it('throws ValidationError for a non-email "from"', () => {
      expect(() => Email.create({ ...valid, from: 'not-valid' })).toThrow(ValidationError);
    });

    it('throws ValidationError for empty "from"', () => {
      expect(() => Email.create({ ...valid, from: '' })).toThrow(ValidationError);
    });
  });

  describe('create() — invalid "subject"', () => {
    it('throws ValidationError for empty subject', () => {
      expect(() => Email.create({ ...valid, subject: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError for whitespace-only subject', () => {
      expect(() => Email.create({ ...valid, subject: '   ' })).toThrow(ValidationError);
    });

    it('throws ValidationError for subject exceeding 255 characters', () => {
      expect(() => Email.create({ ...valid, subject: 'a'.repeat(256) })).toThrow(ValidationError);
    });
  });

  describe('create() — invalid "body"', () => {
    it('throws ValidationError for empty body', () => {
      expect(() => Email.create({ ...valid, body: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError for whitespace-only body', () => {
      expect(() => Email.create({ ...valid, body: '   ' })).toThrow(ValidationError);
    });
  });

  describe('create() — multiple invalid fields', () => {
    it('includes all invalid fields in fieldErrors', () => {
      try {
        Email.create({ ...valid, to: 'bad', from: 'also-bad' });
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const ve = err as ValidationError;
        expect(ve.fieldErrors).toHaveProperty('to');
        expect(ve.fieldErrors).toHaveProperty('from');
      }
    });

    it('sets the error name to "ValidationError"', () => {
      try {
        Email.create({ ...valid, to: 'bad' });
      } catch (err) {
        expect((err as Error).name).toBe('ValidationError');
      }
    });
  });
});
