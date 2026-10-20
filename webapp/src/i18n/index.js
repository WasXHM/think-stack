import en from './en.js';
import zh from './zh.js';
export const LANGUAGE_KEY = 'think-stack-language';
let language = 'zh';
export const getLanguage = () => language;
export function setLanguage(value) { language = value === 'en' ? 'en' : 'zh'; }
export function t(key, values = {}, locale = language) {
  const message = (locale === 'en' ? en : zh)[key] ?? key;
  return String(message).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

let pendingWrites = 0;
const listeners = new Set();
export const hasPendingWrites = () => pendingWrites > 0;
export const subscribeWrites = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export function startWrite() {
  pendingWrites += 1;
  listeners.forEach((listener) => listener());
  return () => { pendingWrites -= 1; listeners.forEach((listener) => listener()); };
}
