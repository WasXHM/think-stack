import { withWriteAuth } from '../../../../lib/auth.js';
import { getTopicStore } from '../../../../lib/topic-store.js';

export async function GET(_request, { params }) {
  return Response.json({ data: await getTopicStore().getTopic(params.topicId) });
}

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore().updateTopic(params.topicId, await request.json()) });
}

async function handleDELETE(_request, { params }) {
  await getTopicStore().deleteTopic(params.topicId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
