import Router from '@koa/router';
import { session, login, logout } from './controller.js';
const router = new Router({ prefix: '/auth' });
router.get('/session', session);
router.post('/login', login);
router.post('/logout', logout);
export default router;
