import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'think-stack-next-smoke-'));
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
let child;
let output = '';
try {
  for (const path of ['app', 'lib', 'package.json', 'next.config.mjs', 'jsconfig.json']) {
    await cp(join(root, path), join(temporary, path), { recursive: true });
  }
  for (const directory of ['webapi', 'webapp']) {
    await mkdir(join(temporary, directory));
    await cp(join(root, directory, 'src'), join(temporary, directory, 'src'), { recursive: true });
  }
  await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: temporary, env: { ...process.env, RESOURCES_DIR: join(temporary, 'resources'), NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const base = `http://127.0.0.1:${port}/think-stack/api`;
  const request = (path, method = 'GET', body, cookie = '') => fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json', 'x-thinkstack-request': '1' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Next.js exited before becoming ready');
    try { if ((await request('/auth/session')).status === 200) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'Next.js becomes ready');
  assert.equal((await request('/topics', 'POST', {})).status, 401);
  assert.equal((await request('/auth/login', 'POST', { username: 'admin', password: 'wrong' })).status, 401);
  const login = await request('/auth/login', 'POST', { username: 'admin', password: 'Xhm775894' });
  assert.equal(login.status, 200, await login.text());
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/auth/session', 'GET', null, cookie)).json()).data.user.username, 'admin');
  assert.equal((await request('/topics', 'POST', { title: 'Smoke test', question: 'Next.js authentication' }, cookie)).status, 201);
  const chinese = await request('/topics?lang=zh', 'POST', { title: '中文测试', question: '中文内容' }, cookie);
  assert.equal(chinese.status, 201);
  const topic = (await chinese.json()).data;
  const topicPath = `/topics/${topic.id}`;
  assert.equal((await (await request(`${topicPath}?lang=en`)).json()).data.title, '中文测试');
  assert.equal((await request(`${topicPath}?lang=en`, 'PATCH', { title: 'English test', question: 'English content' }, cookie)).status, 200);
  assert.equal((await (await request(`${topicPath}?lang=zh`)).json()).data.title, '中文测试');
  assert.equal((await (await request(`${topicPath}?lang=en`)).json()).data.title, 'English test');
  const englishOnly = await request('/topics?lang=en', 'POST', { title: 'English-only topic', question: 'English-only content' }, cookie);
  assert.equal(englishOnly.status, 201);
  const englishId = (await englishOnly.json()).data.id;
  const englishFile = JSON.parse(await readFile(join(temporary, 'resources/topics', englishId, 'topic.en.json'), 'utf8'));
  assert.equal(englishFile.title, 'English-only topic');
  assert.equal((await request('/auth/logout', 'POST', null, cookie)).status, 200);
  assert.equal((await request('/topics', 'POST', {}, cookie)).status, 401);
  const users = await readFile(join(temporary, 'resources/auth/users.json'), 'utf8');
  assert.ok(!users.includes('Xhm775894'));
  console.log('Next.js HTTP smoke passed: authentication, localized reads/writes, Chinese fallback and English-only creation.');
  if (process.argv.includes('--serve')) {
    console.log(`UI verification server: http://127.0.0.1:${port}/think-stack/`);
    await new Promise((resolve) => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
  }
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (child && child.exitCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await stopped;
    clearTimeout(timer);
  }
  await rm(temporary, { recursive: true, force: true });
}
