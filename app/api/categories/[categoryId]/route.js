import { withWriteAuth } from '../../../../lib/auth.js';
import { getTopicStore } from '../../../../lib/topic-store.js';
import { filterCreateCategory } from '../../../../webapi/src/modules/topics/filter.js';

export const PATCH = withWriteAuth(async (request, { params }) => {
  return Response.json({ data: await getTopicStore().renameCategory(params.categoryId, filterCreateCategory(await request.json())) });
});
export const DELETE = withWriteAuth(async (_request, { params }) => {
  return Response.json({ data: await getTopicStore().deleteCategory(params.categoryId) });
});
