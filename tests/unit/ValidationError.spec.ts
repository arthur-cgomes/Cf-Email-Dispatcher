import { ValidationError } from '../../src/domain/errors/ValidationError';

describe('ValidationError', () => {
  it('defaults fieldErrors to empty object when not provided', () => {
    const err = new ValidationError('Something went wrong');
    expect(err.fieldErrors).toEqual({});
    expect(err.message).toBe('Something went wrong');
  });

  it('accepts fieldErrors when provided', () => {
    const err = new ValidationError('Invalid input', { to: ['bad email'] });
    expect(err.fieldErrors).toEqual({ to: ['bad email'] });
  });
});
