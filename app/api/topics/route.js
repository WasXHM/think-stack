import { filterCreateTopic } from '../../../webapi/src/modules/topics/filter.js';
export const dynamic = 'force-dynamic';
import { withOptionalAuth, withWriteAuth } from '../../../lib/auth.js';
import { getTopicStore } from '../../../lib/topic-store.js';

async function handleGET(request, _context, user) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  return Response.json({ data: await getTopicStore(request).listTopics({ query, viewerUsername: user?.username }) });
}
export const GET = withOptionalAuth(handleGET);

async function handlePOST(request, _context, user) {
  return Response.json({ data: await getTopicStore(request).createTopic(filterCreateTopic(await request.json()), user.username) }, { status: 201 });
}

export const POST = withWriteAuth(handlePOST);
