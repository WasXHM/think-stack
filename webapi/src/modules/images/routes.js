import Router from '@koa/router';
import { getImage, uploadImage } from './controller.js';

const router = new Router({ prefix: '/images' });
router.post('/', uploadImage);
router.get('/:name', getImage);
export default router;
