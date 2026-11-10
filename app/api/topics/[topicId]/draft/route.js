import { withWriteAuth } from '../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../lib/topic-store.js';
import { filterSaveTopicDraft } from '../../../../../webapi/src/modules/topics/filter.js';

export const dynamic = 'force-dynamic';

async function handlePUT(request, { params }, user) {
  const draft = await getTopicStore(request).saveDraft(
    params.topicId,
    filterSaveTopicDraft(await request.json()),
    user.username,
  );
  return Response.json({ data: draft });
}

async function handleDELETE(request, { params }, user) {
  await getTopicStore(request).deleteDraft(params.topicId, user.username);
  return new Response(null, { status: 204 });
}

export const PUT = withWriteAuth(handlePUT);
export const DELETE = withWriteAuth(handleDELETE);
