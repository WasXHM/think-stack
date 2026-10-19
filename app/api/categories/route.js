import { withWriteAuth } from '../../../lib/auth.js';
import { getTopicStore } from '../../../lib/topic-store.js';

export async function GET() {
  return Response.json({ data: await getTopicStore().listCategories() });
}

async function handlePOST(request) {
  return Response.json({ data: await getTopicStore().createCategory(await request.json()) }, { status: 201 });
}

export const POST = withWriteAuth(handlePOST);
