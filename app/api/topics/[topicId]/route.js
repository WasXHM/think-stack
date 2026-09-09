import { getTopicStore } from '../../../../lib/topic-store.js';

export async function GET(_request, { params }) {
  return Response.json({ data: await getTopicStore().getTopic(params.topicId) });
}

export async function PATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateTopic(params.topicId, await request.json()) });
}

export async function DELETE(_request, { params }) {
  await getTopicStore().deleteTopic(params.topicId);
  return new Response(null, { status: 204 });
}
