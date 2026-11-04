import { filterUpdateExternalAnswer } from '../../../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }, user) {
  return Response.json({ data: await getTopicStore(request).updateExternalAnswer(params.topicId, params.answerId, filterUpdateExternalAnswer(await request.json()), user.username) });
}

async function handleDELETE(request, { params }, user) {
  await getTopicStore(request).deleteExternalAnswer(params.topicId, params.answerId, user.username);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
