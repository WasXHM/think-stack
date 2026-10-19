import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApplication } from '../src/app.js';

test('anonymous reads, protected writes, persistent sessions, expiry and logout', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-auth-'));
  const runtime = createApplication({ resourcesDir, logger: { log() {}, error() {} } });
  await runtime.start({ port: 0 });
  t.after(async () => { await runtime.stop(); await rm(resourcesDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${runtime.server.address().port}`;
  const send = (path, method = 'GET', body, cookie = '', marker = true) => fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json', ...(marker ? { 'x-thinkstack-request': '1' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await send('/topics')).status, 200);
  assert.equal((await send('/categories')).status, 200);
  for (const [method, path] of [['POST','/topics'], ['PATCH','/topics/fake'], ['DELETE','/topics/fake'], ['POST','/categories'], ['POST','/images'], ['POST','/topics/fake/external-answers'], ['PATCH','/topics/fake/external-answers/fake'], ['DELETE','/topics/fake/external-answers/fake'], ['POST','/topics/fake/understandings'], ['PATCH','/topics/fake/understandings/fake'], ['DELETE','/topics/fake/understandings/fake']]) {
    assert.equal((await send(path, method, {})).status, 401, path);
  }
  assert.equal((await send('/auth/login', 'POST', { username: 'admin', password: 'wrong' })).status, 401);
  assert.equal((await send('/auth/login', 'POST', {})).status, 400);
  const login = await send('/auth/login', 'POST', { username: 'admin', password: 'Xhm775894' });
  assert.equal(login.status, 200);
  const header = login.headers.get('set-cookie');
  assert.match(header, /httponly/i); assert.match(header, /samesite=strict/i);
  const cookie = header.split(';')[0];
  assert.deepEqual((await (await send('/auth/session', 'GET', null, cookie)).json()).data.user, { username: 'admin' });
  assert.equal((await send('/topics', 'POST', { title: 'Test', question: 'Question' }, cookie, false)).status, 403);
  const created = await send('/topics', 'POST', { title: 'Test', question: 'Question' }, cookie);
  assert.equal(created.status, 201);
  const id = (await created.json()).data.id;
  assert.equal((await send(`/topics/${id}`)).status, 200);
  assert.equal((await send('/topics', 'POST', {}, 'thinkstack_session=forged')).status, 401);
  const disk = await readFile(join(resourcesDir, 'auth/users.json'), 'utf8');
  assert.ok(!disk.includes('Xhm775894'));
  const second = createApplication({ resourcesDir, logger: { log() {}, error() {} } });
  await second.start({ port: 0 });
  try {
    const session = await fetch(`http://127.0.0.1:${second.server.address().port}/auth/session`, { headers: { cookie } });
    assert.equal((await session.json()).data.user.username, 'admin');
  } finally { await second.stop(); }
  assert.equal((await send('/auth/logout', 'POST', null, cookie)).status, 200);
  assert.equal((await send(`/topics/${id}`, 'DELETE', null, cookie)).status, 401);
  const again = await send('/auth/login', 'POST', { username: 'admin', password: 'Xhm775894' });
  const expiredCookie = again.headers.get('set-cookie').split(';')[0];
  const files = await readdir(join(resourcesDir, 'auth/sessions'));
  await writeFile(join(resourcesDir, 'auth/sessions', files[0]), JSON.stringify({ username: 'admin', expiresAt: 0 }));
  assert.equal((await send(`/topics/${id}`, 'DELETE', null, expiredCookie)).status, 401);
});
