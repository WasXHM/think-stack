import { withWriteAuth } from '../../../lib/auth.js';
import { getTopicStore } from '../../../lib/topic-store.js';

export async function GET(request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  return Response.json({ data: await getTopicStore().listTopics({ query }) });
}

async function handlePOST(request) {
  return Response.json({ data: await getTopicStore().createTopic(await request.json()) }, { status: 201 });
}

export const POST = withWriteAuth(handlePOST);
