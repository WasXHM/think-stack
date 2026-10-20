import { FileTopicStore } from '../webapi/src/storage/topic-store.js';
import { withLocale, requestLocale } from '../webapi/src/core/locale.js';
import { resourcesDir } from './resources.js';

let store;
export function getTopicStore(request) {
  if (!store) store = new FileTopicStore({ resourcesDir });
  if (!request) return store;
  const locale = requestLocale(request);
  return new Proxy(store, {
    get(target, property) {
      const value = target[property];
      return typeof value === 'function' ? (...args) => withLocale(locale, () => value.apply(target, args)) : value;
    },
  });
}
