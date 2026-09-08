import { ValidationError } from './errors.js';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function validateUuid(value, field) {
  if (!isUuid(value)) {
    throw new ValidationError(`${field} must be a valid UUID`, [
      { field, message: 'Must be a valid UUID' },
    ]);
  }

  return value.toLowerCase();
}
