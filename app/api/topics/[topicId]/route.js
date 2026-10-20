import { filterUpdateTopic } from '../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../lib/auth.js';
import { getTopicStore } from '../../../../lib/topic-store.js';

export async function GET(request, { params }) {
  return Response.json({ data: await getTopicStore(request).getTopic(params.topicId) });
}

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore(request).updateTopic(params.topicId, filterUpdateTopic(await request.json())) });
}

async function handleDELETE(request, { params }) {
  await getTopicStore(request).deleteTopic(params.topicId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
