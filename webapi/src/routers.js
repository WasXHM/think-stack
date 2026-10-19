import Router from '@koa/router';

import imagesRouter from './modules/images/routes.js';
import healthRouter from './modules/health/routes.js';
import topicsRouter from './modules/topics/routes.js';

import { listCategories, createCategory, reorderCategories, renameCategory, deleteCategory } from './modules/topics/controller.js';

import authRouter from './modules/auth/routes.js';

const router = new Router();
router.use(authRouter.routes(), authRouter.allowedMethods({ throw: true }));
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.patch('/categories', reorderCategories);
router.patch('/categories/:categoryId', renameCategory);
router.delete('/categories/:categoryId', deleteCategory);

router.use(imagesRouter.routes(), imagesRouter.allowedMethods({ throw: true }));
router.use(healthRouter.routes(), healthRouter.allowedMethods({ throw: true }));
router.use(topicsRouter.routes(), topicsRouter.allowedMethods({ throw: true }));

export default router;
