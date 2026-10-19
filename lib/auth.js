import { resourcesDir } from './resources.js';
import { createAuthService, readToken, requireWriteHeader, unauthorized } from '../webapi/src/modules/auth/service.js';
export const auth = createAuthService(resourcesDir);
export function authError(error) {
  return Response.json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: error.status < 500 ? error.message : '服务暂时不可用。' } }, { status: error.status ?? 500, headers: { 'Cache-Control': 'no-store' } });
}
export function withWriteAuth(handler) {
  return async (request, context) => {
    try {
      if (!await auth.getUser(readToken(request.headers.get('cookie') ?? ''))) throw unauthorized();
      requireWriteHeader(request.headers.get('x-thinkstack-request'));
      return await handler(request, context);
    } catch (error) { return authError(error); }
  };
}
