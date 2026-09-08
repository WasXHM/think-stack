import Router from '@koa/router';

import { getHealth } from './controller.js';

const router = new Router();

router.get('/health', getHealth);

export default router;
