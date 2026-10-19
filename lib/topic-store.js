import { FileTopicStore } from '../webapi/src/storage/topic-store.js';

import { resourcesDir } from './resources.js';

let store;
export function getTopicStore() {
  if (!store) store = new FileTopicStore({ resourcesDir });
  return store;
}
