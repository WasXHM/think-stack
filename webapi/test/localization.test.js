import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FileTopicStore } from '../src/storage/topic-store.js';
import { withLocale } from '../src/core/locale.js';

test('localized topic and child content falls back without overwriting Chinese resources', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-locale-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const store = new FileTopicStore({ resourcesDir });
  const en = (operation) => withLocale('en', operation);
  const topic = await store.createTopic({ title: '中文标题', question: '中文问题' });
  const answer = await store.createExternalAnswer(topic.id, { source: '中文来源', content: '中文回答' });
  const understanding = await store.createUnderstanding(topic.id, { content: '中文理解' });
  const directory = join(resourcesDir, 'topics', topic.id);
  assert.equal((await en(() => store.getTopic(topic.id))).title, '中文标题');
  assert.ok(!(await readdir(directory)).includes('topic.en.json'));
  const category = await store.createCategory({ name: '分类' });
  await en(() => store.updateTopic(topic.id, { categoryId: category.id }));
  assert.ok(!(await readdir(directory)).includes('topic.en.json'), 'metadata changes do not create a translation');
  await en(() => store.updateTopic(topic.id, { title: 'English title', question: 'English question' }));
  const base = JSON.parse(await readFile(join(directory, 'topic.json'), 'utf8'));
  const translation = JSON.parse(await readFile(join(directory, 'topic.en.json'), 'utf8'));
  assert.equal(base.title, '中文标题');
  assert.equal(base.question, '中文问题');
  assert.deepEqual(translation, { title: 'English title', question: 'English question' });
  assert.equal((await store.getTopic(topic.id)).title, '中文标题');
  const englishView = await en(() => store.getTopic(topic.id));
  assert.equal(englishView.title, 'English title');
  assert.equal(englishView.externalAnswers[0].content, '中文回答');
  assert.equal(englishView.understandings[0].content, '中文理解');
  await en(() => store.updateExternalAnswer(topic.id, answer.id, { source: 'English source', content: 'English answer' }));
  await en(() => store.updateUnderstanding(topic.id, understanding.id, { content: 'English understanding' }));
  const chineseView = await store.getTopic(topic.id);
  assert.equal(chineseView.externalAnswers[0].content, '中文回答');
  assert.equal(chineseView.understandings[0].content, '中文理解');
  assert.equal((await en(() => store.getTopic(topic.id))).externalAnswers[0].content, 'English answer');
  await store.updateTopic(topic.id, { title: '新的中文标题' });
  assert.equal((await en(() => store.getTopic(topic.id))).title, 'English title');
  assert.equal((await en(() => store.listTopics({ query: 'English' }))).total, 1);
  assert.equal((await store.listTopics({ query: 'English' })).total, 0);
  await en(() => store.deleteCategory(category.id));
  assert.equal((await en(() => store.getTopic(topic.id))).categoryId, 'default');
  assert.equal((await store.getTopic(topic.id)).title, '新的中文标题');
  await store.deleteExternalAnswer(topic.id, answer.id);
  await assert.rejects(access(join(directory, 'external-answers', `${answer.id}.en.json`)));
  const restart = new FileTopicStore({ resourcesDir });
  assert.equal((await en(() => restart.getTopic(topic.id))).title, 'English title');
  assert.equal((await restart.getTopic(topic.id)).title, '新的中文标题');
});

test('English-only creation stores content in English files and concurrent locales stay isolated', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-locale-create-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const store = new FileTopicStore({ resourcesDir });
  const en = (operation) => withLocale('en', operation);
  const topic = await en(() => store.createTopic({ title: 'English only', question: 'Question' }));
  const directory = join(resourcesDir, 'topics', topic.id);
  const base = JSON.parse(await readFile(join(directory, 'topic.json'), 'utf8'));
  assert.equal(base.title, undefined);
  assert.equal((await store.getTopic(topic.id)).title, 'English only');
  const child = await en(() => store.createUnderstanding(topic.id, { content: 'English note' }));
  assert.equal(JSON.parse(await readFile(join(directory, 'understandings', `${child.id}.json`), 'utf8')).content, undefined);
  assert.equal((await store.getTopic(topic.id)).understandings[0].content, 'English note');
  await Promise.all([
    withLocale('zh', () => store.updateTopic(topic.id, { title: '中文版本', question: '中文问题' })),
    en(() => store.updateTopic(topic.id, { title: 'English version', question: 'English question' })),
  ]);
  const views = await Promise.all([store.getTopic(topic.id), en(() => store.getTopic(topic.id))]);
  assert.equal(views[0].title, '中文版本');
  assert.equal(views[1].title, 'English version');
  assert.equal((await en(() => store.listTopics())).items[0].understandingCount, 1);
  await store.deleteTopic(topic.id);
  assert.equal((await en(() => store.listTopics())).total, 0);
});

test('Koa HTTP language context selects versions and rejects unsupported locales', async (t) => {
  const { createApplication } = await import('../src/app.js');
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-locale-http-'));
  const runtime = createApplication({ resourcesDir, logger: { log() {}, error() {} } });
  await runtime.start({ port: 0 });
  t.after(async () => { await runtime.stop(); await rm(resourcesDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${runtime.server.address().port}`;
  let cookie = '';
  const request = (path, method = 'GET', body, locale = 'zh') => fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json', 'x-thinkstack-request': '1', 'x-thinkstack-language': locale }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const login = await request('/auth/login', 'POST', { username: 'admin', password: 'Xhm775894' });
  cookie = login.headers.get('set-cookie').split(';')[0];
  const created = await request('/topics', 'POST', { title: '中文', question: '问题' });
  const id = (await created.json()).data.id;
  assert.equal((await request(`/topics/${id}`, 'PATCH', { title: 'English', question: 'Question' }, 'en')).status, 200);
  assert.equal((await (await request(`/topics/${id}`)).json()).data.title, '中文');
  assert.equal((await (await request(`/topics/${id}?lang=en`)).json()).data.title, 'English');
  assert.equal((await request('/topics?lang=fr')).status, 400);
  const englishCreated = await request('/topics', 'POST', { title: 'English-only HTTP', question: 'Question' }, 'en');
  const englishId = (await englishCreated.json()).data.id;
  assert.equal(JSON.parse(await readFile(join(resourcesDir, 'topics', englishId, 'topic.en.json'), 'utf8')).title, 'English-only HTTP');
});
