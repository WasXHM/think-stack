import { getTopicStore } from '../../../lib/topic-store.js';

export async function GET() {
  const storage = await getTopicStore().inspect();
  return Response.json({ data: { status: 'ok', storage: storage.status, storageDriver: storage.driver, topicCount: storage.topicCount } });
}
