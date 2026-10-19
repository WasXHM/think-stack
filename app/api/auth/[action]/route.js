import { auth, authError } from '../../../../lib/auth.js';
import { COOKIE, SESSION_SECONDS, readToken, requireWriteHeader } from '../../../../webapi/src/modules/auth/service.js';
import { filterLogin } from '../../../../webapi/src/modules/auth/filter.js';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  if (params.action !== 'session') return new Response(null, { status: 404 });
  try { return Response.json({ data: { user: await auth.getUser(readToken(request.headers.get('cookie') ?? '')) } }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return authError(error); }
}
export async function POST(request, { params }) {
  try {
    requireWriteHeader(request.headers.get('x-thinkstack-request'));
    const token = readToken(request.headers.get('cookie') ?? '');
    let result;
    if (params.action === 'login') result = await auth.login(filterLogin(await request.json()), token);
    else if (params.action === 'logout') { await auth.logout(token); result = { token: '', user: null }; }
    else return new Response(null, { status: 404 });
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return Response.json({ data: { user: result.user } }, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': `${COOKIE}=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${result.user ? SESSION_SECONDS : 0}${secure}` } });
  } catch (error) { return authError(error); }
}
