import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateExternalAnswer(params.topicId, params.answerId, await request.json()) });
}

async function handleDELETE(_request, { params }) {
  await getTopicStore().deleteExternalAnswer(params.topicId, params.answerId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
