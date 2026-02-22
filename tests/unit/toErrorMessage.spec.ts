import { toErrorMessage } from '../../src/infrastructure/utils/toErrorMessage';

describe('toErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(toErrorMessage(new Error('something broke'))).toBe('something broke');
  });

  it('returns the string directly when err is a string', () => {
    expect(toErrorMessage('plain string error')).toBe('plain string error');
  });

  it('converts other values via String()', () => {
    expect(toErrorMessage(42)).toBe('42');
  });
});
