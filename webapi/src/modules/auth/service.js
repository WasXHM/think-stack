import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from '../../core/errors.js';
import adminSeed from './admin-seed.js';

const scrypt = promisify(derive);
export const COOKIE = 'thinkstack_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const unauthorized = () => new AppError({ status: 401, code: 'AUTH_REQUIRED', message: '请先登录后再进行修改。' });
export function requireWriteHeader(value) {
  if (value !== '1') throw new AppError({ status: 403, code: 'INVALID_REQUEST', message: '请求校验失败，请刷新页面后重试。' });
}
export function readToken(cookie = '') {
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
}
export function createAuthService(resourcesDir) {
  const directory = join(resourcesDir, 'auth');
  const usersFile = join(directory, 'users.json');
  let initialization;
  function initialize() {
    return initialization ??= (async () => {
      await mkdir(join(directory, 'sessions'), { recursive: true, mode: 0o700 });
      const seed = `${JSON.stringify(adminSeed, null, 2)}\n`;
      await writeFile(usersFile, seed, { flag: 'wx', mode: 0o600 }).catch((error) => { if (error.code !== 'EEXIST') throw error; });
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  const sessionFile = (token) => join(directory, 'sessions', `${createHash('sha256').update(token).digest('hex')}.json`);
  async function getUser(token) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    await initialize();
    try {
      const session = JSON.parse(await readFile(sessionFile(token), 'utf8'));
      if (session.expiresAt <= Date.now()) { await logout(token); return null; }
      const { users } = JSON.parse(await readFile(usersFile, 'utf8'));
      return users.some((user) => user.username === session.username) ? { username: session.username } : null;
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function logout(token) {
    if (!/^[a-f0-9]{64}$/.test(token)) return;
    await unlink(sessionFile(token)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
  async function login({ username, password }, oldToken) {
    await initialize();
    console.log(usersFile);
    const { users } = JSON.parse(await readFile(usersFile, 'utf8'));
    const user = users.find((entry) => entry.username === username);
    const candidate = user ?? users[0];
    const hash = await scrypt(password, candidate.salt, 64);
    if (!user || !timingSafeEqual(hash, Buffer.from(user.passwordHash, 'hex'))) {
      throw new AppError({ status: 401, code: 'INVALID_CREDENTIALS', message: '用户名或密码错误。' });
    }
    const token = randomBytes(32).toString('hex');
    await writeFile(sessionFile(token), JSON.stringify({ username: user.username, expiresAt: Date.now() + SESSION_SECONDS * 1000 }), { flag: 'wx', mode: 0o600 });
    await logout(oldToken);
    return { token, user: { username: user.username } };
  }
  return { initialize, getUser, login, logout };
}
