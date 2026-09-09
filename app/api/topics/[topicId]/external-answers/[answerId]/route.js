import { getTopicStore } from '../../../../../../lib/topic-store.js';

export async function PATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateExternalAnswer(params.topicId, params.answerId, await request.json()) });
}

export async function DELETE(_request, { params }) {
  await getTopicStore().deleteExternalAnswer(params.topicId, params.answerId);
  return new Response(null, { status: 204 });
}
