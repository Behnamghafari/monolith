import { AppError } from '../../shared/errors/app-error.js';

export function normalizeIranianPhone(input: string): string {
  const compact = input.replace(/[\s()-]/g, '');
  const normalized = compact.startsWith('+98') ? `0${compact.slice(3)}`
    : compact.startsWith('0098') ? `0${compact.slice(4)}` : compact;
  if (!/^09\d{9}$/.test(normalized)) throw new AppError(422, 'INVALID_PHONE', 'INVALID_PHONE');
  return normalized;
}
