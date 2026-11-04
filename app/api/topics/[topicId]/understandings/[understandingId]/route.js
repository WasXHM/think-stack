import { filterUpdateUnderstanding } from '../../../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }, user) {
  return Response.json({ data: await getTopicStore(request).updateUnderstanding(params.topicId, params.understandingId, filterUpdateUnderstanding(await request.json()), user.username) });
}

async function handleDELETE(request, { params }, user) {
  await getTopicStore(request).deleteUnderstanding(params.topicId, params.understandingId, user.username);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
