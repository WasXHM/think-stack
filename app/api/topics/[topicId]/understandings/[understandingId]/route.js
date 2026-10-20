import { filterUpdateUnderstanding } from '../../../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../../lib/topic-store.js';

async function handlePATCH(request, { params }) {
  return Response.json({ data: await getTopicStore(request).updateUnderstanding(params.topicId, params.understandingId, filterUpdateUnderstanding(await request.json())) });
}

async function handleDELETE(request, { params }) {
  await getTopicStore(request).deleteUnderstanding(params.topicId, params.understandingId);
  return new Response(null, { status: 204 });
}

export const PATCH = withWriteAuth(handlePATCH);
export const DELETE = withWriteAuth(handleDELETE);
