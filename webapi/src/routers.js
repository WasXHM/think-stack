import Router from '@koa/router';

import healthRouter from './modules/health/routes.js';
import topicsRouter from './modules/topics/routes.js';

const router = new Router();

router.use(healthRouter.routes(), healthRouter.allowedMethods({ throw: true }));
router.use(topicsRouter.routes(), topicsRouter.allowedMethods({ throw: true }));

export default router;
