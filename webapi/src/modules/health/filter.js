import { ValidationError } from '../../core/errors.js';

export function filterHealthQuery(query = {}) {
  const value = query.verbose;

  if (value === undefined || value === 'false') {
    return { verbose: false };
  }

  if (value === 'true') {
    return { verbose: true };
  }

  throw new ValidationError('verbose must be true or false', [
    { field: 'verbose', message: 'Must be true or false' },
  ]);
}
