import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('Next.js routes share authentication and protect every mutation', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'think-stack-next-auth-'));
  process.env.RESOURCES_DIR = dir;
  t.after(() => rm(dir, { recursive: true, force: true }));
  const routes = [
    'topics', 'categories', 'categories/[categoryId]', 'images', 'topics/[topicId]',
    'topics/[topicId]/external-answers', 'topics/[topicId]/external-answers/[answerId]',
    'topics/[topicId]/understandings', 'topics/[topicId]/understandings/[understandingId]',
  ];
  const request = (path, method = 'GET', body, cookie = '', marker = true) => new Request(`http://localhost/think-stack/api/${path}`, { method, headers: { cookie, 'content-type': 'application/json', ...(marker ? { 'x-thinkstack-request': '1' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const path of routes) {
    const route = await import(`../../app/api/${path}/route.js`);
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      if (route[method]) assert.equal((await route[method](request(path, method, {}), { params: {} })).status, 401, `${method} ${path}`);
    }
  }
  const auth = await import('../../app/api/auth/[action]/route.js');
  const credentials = { username: 'admin', password: 'Xhm775894' };
  assert.equal((await auth.POST(request('auth/login', 'POST', { ...credentials, password: 'wrong' }), { params: { action: 'login' } })).status, 401);
  const login = await auth.POST(request('auth/login', 'POST', credentials), { params: { action: 'login' } });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const session = await auth.GET(request('auth/session', 'GET', null, cookie), { params: { action: 'session' } });
  assert.equal((await session.json()).data.user.username, 'admin');
  const categories = await import('../../app/api/categories/route.js');
  const category = await categories.POST(request('categories', 'POST', { name: '排序分类' }, cookie));
  const categoryId = (await category.json()).data.id;
  const ordered = await categories.PATCH(request('categories', 'PATCH', { categoryIds: [categoryId, 'default'] }, cookie));
  assert.equal(ordered.status, 200);
  assert.deepEqual((await ordered.json()).data.items.map((item) => item.id), [categoryId, 'default']);
  const categoryRoute = await import('../../app/api/categories/[categoryId]/route.js');
  assert.equal((await categoryRoute.PATCH(request(`categories/${categoryId}`, 'PATCH', { name: '重命名分类' }, cookie), { params: { categoryId } })).status, 200);
  const topics = await import('../../app/api/topics/route.js');
  assert.equal((await topics.GET(request('topics'))).status, 200);
  assert.equal((await topics.POST(request('topics', 'POST', {}, cookie, false))).status, 403);
  const created = await topics.POST(request('topics', 'POST', { title: 'Test', question: 'Question' }, cookie));
  assert.equal(created.status, 201);
  const id = (await created.json()).data.id;
  const detail = await import('../../app/api/topics/[topicId]/route.js');
  assert.equal((await detail.GET(request(`topics/${id}`), { params: { topicId: id } })).status, 200);
  assert.equal((await detail.PATCH(request(`topics/${id}`, 'PATCH', { title: 'Updated', question: 'Question' }, cookie), { params: { topicId: id } })).status, 200);
  await detail.PATCH(request(`topics/${id}`, 'PATCH', { categoryId }, cookie), { params: { topicId: id } });
  assert.equal((await categoryRoute.DELETE(request(`categories/${categoryId}`, 'DELETE', null, cookie), { params: { categoryId } })).status, 200);
  const moved = await detail.GET(request(`topics/${id}`), { params: { topicId: id } });
  assert.equal((await moved.json()).data.categoryId, 'default');
  await auth.POST(request('auth/logout', 'POST', null, cookie), { params: { action: 'logout' } });
  assert.equal((await detail.DELETE(request(`topics/${id}`, 'DELETE', null, cookie), { params: { topicId: id } })).status, 401);
});
