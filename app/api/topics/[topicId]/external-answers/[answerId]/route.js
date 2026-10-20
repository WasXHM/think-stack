import { filterUpdateExternalAnswer } from '../../../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore(request).updateExternalAnswer(params.topicId, params.answerId, filterUpdateExternalAnswer(await request.json())) });
}

async function handleDELETE(request, { params }) {
  await getTopicStore(request).deleteExternalAnswer(params.topicId, params.answerId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
