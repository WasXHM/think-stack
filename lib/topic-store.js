import { FileTopicStore } from '../webapi/src/storage/topic-store.js';

const resourcesDir = process.env.RESOURCES_DIR
  ? (process.env.RESOURCES_DIR.startsWith('/') ? process.env.RESOURCES_DIR : `${process.cwd()}/webapi/${process.env.RESOURCES_DIR}`)
  : `${process.cwd()}/webapi/resources`;

let store;
export function getTopicStore() {
  if (!store) store = new FileTopicStore({ resourcesDir });
  return store;
}
