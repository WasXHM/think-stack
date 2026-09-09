import { getTopicStore } from '../../../../../lib/topic-store.js';

export async function POST(request, { params }) {
  return Response.json({ data: await getTopicStore().createUnderstanding(params.topicId, await request.json()) }, { status: 201 });
}
