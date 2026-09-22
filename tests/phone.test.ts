import { describe, expect, it } from 'vitest';
import { normalizeIranianPhone } from '../src/modules/users/phone.js';

describe('normalizeIranianPhone', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
  ])('normalizes %s', (input, expected) => expect(normalizeIranianPhone(input)).toBe(expected));

  it('rejects invalid phone numbers', () => expect(() => normalizeIranianPhone('123')).toThrow('INVALID_PHONE'));
});
