import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateUnderstanding(params.topicId, params.understandingId, await request.json()) });
}

async function handleDELETE(_request, { params }) {
  await getTopicStore().deleteUnderstanding(params.topicId, params.understandingId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
