import { filterUpdateTopic } from '../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withOptionalAuth, withWriteAuth } from '../../../../lib/auth.js';
import { getTopicStore } from '../../../../lib/topic-store.js';

async function handleGET(request, { params }, user) {
  return Response.json({ data: await getTopicStore(request).getTopic(params.topicId, { viewerUsername: user?.username }) });
}
export const GET = withOptionalAuth(handleGET);

async function handlePATCH(request, { params }, user) {
  return Response.json({ data: await getTopicStore(request).updateTopic(params.topicId, filterUpdateTopic(await request.json()), user.username) });
}

async function handleDELETE(request, { params }, user) {
  await getTopicStore(request).deleteTopic(params.topicId, user.username);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
