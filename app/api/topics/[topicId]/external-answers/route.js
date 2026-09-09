import { getTopicStore } from '../../../../../lib/topic-store.js';

export async function POST(request, { params }) {
  return Response.json({ data: await getTopicStore().createExternalAnswer(params.topicId, await request.json()) }, { status: 201 });
}
