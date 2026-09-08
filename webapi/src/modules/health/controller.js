import { filterHealthQuery } from './filter.js';
import { getHealthStatus } from './service.js';

export async function getHealth(ctx) {
  const input = filterHealthQuery(ctx.query);
  ctx.body = {
    data: await getHealthStatus({ ...input, topicStore: ctx.topicStore }),
  };
}
