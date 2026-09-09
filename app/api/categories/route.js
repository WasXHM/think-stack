import { getTopicStore } from '../../../lib/topic-store.js';

export async function GET() {
  return Response.json({ data: await getTopicStore().listCategories() });
}

export async function POST(request) {
  return Response.json({ data: await getTopicStore().createCategory(await request.json()) }, { status: 201 });
}
