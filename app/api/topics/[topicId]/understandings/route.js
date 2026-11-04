import { filterCreateUnderstanding } from '../../../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withWriteAuth } from '../../../../../lib/auth.js';
import { getTopicStore } from '../../../../../lib/topic-store.js';

async function handlePOST(request, { params }, user) {
  return Response.json({ data: await getTopicStore(request).createUnderstanding(params.topicId, filterCreateUnderstanding(await request.json()), user.username) }, { status: 201 });
}

export const POST = withWriteAuth(handlePOST);
