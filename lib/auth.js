import { resourcesDir } from './resources.js';
import { createAuthService, readToken, requireWriteHeader, unauthorized } from '../webapi/src/modules/auth/service.js';
export const auth = createAuthService(resourcesDir);
export function authError(error) {
  return Response.json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: error.status < 500 ? error.message : '服务暂时不可用。' } }, { status: error.status ?? 500, headers: { 'Cache-Control': 'no-store' } });
}
export function getRequestUser(request) {
  return auth.getUser(readToken(request.headers.get('cookie') ?? ''));
}
export function withOptionalAuth(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context, await getRequestUser(request));
    } catch (error) { return authError(error); }
  };
}
export function withWriteAuth(handler) {
  return async (request, context) => {
    try {
      const user = await getRequestUser(request);
      if (!user) throw unauthorized();
      requireWriteHeader(request.headers.get('x-thinkstack-request'));
      return await handler(request, context, user);
    } catch (error) { return authError(error); }
  };
}
