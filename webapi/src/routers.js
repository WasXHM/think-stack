import Router from '@koa/router';

import imagesRouter from './modules/images/routes.js';
import healthRouter from './modules/health/routes.js';
import topicsRouter from './modules/topics/routes.js';

import { listCategories, createCategory } from './modules/topics/controller.js';

const router = new Router();
router.get('/categories', listCategories);
router.post('/categories', createCategory);

router.use(imagesRouter.routes(), imagesRouter.allowedMethods({ throw: true }));
router.use(healthRouter.routes(), healthRouter.allowedMethods({ throw: true }));
router.use(topicsRouter.routes(), topicsRouter.allowedMethods({ throw: true }));

export default router;
