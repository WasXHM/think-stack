import { withWriteAuth } from '../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../lib/topic-store.js';

async function handlePOST(request, { params }) {
  return Response.json({ data: await getTopicStore().createUnderstanding(params.topicId, await request.json()) }, { status: 201 });
}

export const POST = withWriteAuth(handlePOST);
