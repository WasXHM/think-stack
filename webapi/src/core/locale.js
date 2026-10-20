import { AsyncLocalStorage } from 'node:async_hooks';
import { ValidationError } from './errors.js';

const context = new AsyncLocalStorage();
export function normalizeLocale(value) {
  if (value == null || value === '') return 'zh';
  if (value === 'zh' || value === 'en') return value;
  throw new ValidationError('Unsupported language. Use zh or en.');
}
export const currentLocale = () => context.getStore() ?? 'zh';
export const withLocale = (locale, operation) => context.run(normalizeLocale(locale), operation);
export const requestLocale = (request) => normalizeLocale(new URL(request.url).searchParams.get('lang') ?? request.headers.get('x-thinkstack-language'));
