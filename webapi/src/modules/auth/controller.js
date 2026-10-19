import { COOKIE, SESSION_SECONDS } from './service.js';
import { filterLogin } from './filter.js';
function cookie(ctx, value, maxAge) {
  ctx.cookies.set(COOKIE, value, { httpOnly: true, sameSite: 'strict', secure: ctx.secure, path: '/', maxAge, overwrite: true });
}
export async function session(ctx) { ctx.body = { data: { user: ctx.state.user } }; }
export async function login(ctx) {
  const result = await ctx.authService.login(filterLogin(ctx.request.body), ctx.cookies.get(COOKIE));
  cookie(ctx, result.token, SESSION_SECONDS * 1000);
  ctx.body = { data: { user: result.user } };
}
export async function logout(ctx) {
  await ctx.authService.logout(ctx.cookies.get(COOKIE));
  cookie(ctx, '', 0);
  ctx.body = { data: { user: null } };
}
