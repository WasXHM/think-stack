import { getTopicStore } from '../../../../../../lib/topic-store.js';

export async function PATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateUnderstanding(params.topicId, params.understandingId, await request.json()) });
}

export async function DELETE(_request, { params }) {
  await getTopicStore().deleteUnderstanding(params.topicId, params.understandingId);
  return new Response(null, { status: 204 });
}
