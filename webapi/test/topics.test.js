import assert from 'node:assert/strict';
import { access, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import test from 'node:test';

import { createApplication } from '../src/app.js';

const quietLogger = {
  log() {},
  error() {},
};

async function createTestApi(t, existingResourcesDir) {
  const resourcesDir = existingResourcesDir ?? await mkdtemp(join(tmpdir(), 'think-stack-api-'));
  const runtime = createApplication({ resourcesDir, logger: quietLogger });
  await runtime.start({ host: '127.0.0.1', port: 0 });
  const address = runtime.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await runtime.stop('test cleanup');
  });

  return { ...runtime, baseUrl, resourcesDir };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const rawBody = await response.text();
  const body = rawBody ? JSON.parse(rawBody) : null;
  return { response, body };
}

function json(method, body) {
  return { method, body: JSON.stringify(body) };
}

test('health and unknown routes always return JSON', async (t) => {
  const api = await createTestApi(t);
  t.after(() => rm(api.resourcesDir, { recursive: true, force: true }));

  const health = await request(api.baseUrl, '/health?verbose=true');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.data.status, 'ok');
  assert.equal(health.body.data.storage, 'ready');
  assert.equal(health.body.data.storageDriver, 'filesystem');
  assert.equal(health.body.data.topicCount, 0);

  const missing = await request(api.baseUrl, '/missing');
  assert.equal(missing.response.status, 404);
  assert.match(missing.response.headers.get('content-type'), /application\/json/);
  assert.equal(missing.body.error.code, 'NOT_FOUND');

  const methodNotAllowed = await request(api.baseUrl, '/health', { method: 'POST' });
  assert.equal(methodNotAllowed.response.status, 405);
  assert.equal(methodNotAllowed.body.error.code, 'METHOD_NOT_ALLOWED');

  const invalidJson = await request(api.baseUrl, '/topics', {
    method: 'POST',
    body: '{',
    headers: { 'content-type': 'application/json' },
  });
  assert.equal(invalidJson.response.status, 400);
  assert.equal(invalidJson.body.error.code, 'INVALID_JSON');
});

test('relative resource configuration is anchored to the webapi directory', async () => {
  const runtime = createApplication({
    env: { RESOURCES_DIR: './relative-resources' },
    logger: quietLogger,
  });
  const webapiDirectory = fileURLToPath(new URL('../', import.meta.url));

  assert.equal(runtime.resourcesDir, resolve(webapiDirectory, 'relative-resources'));
  await runtime.stop('configuration test');
});

test('topic and child CRUD persists as independent text resources', async (t) => {
  const api = await createTestApi(t);
  t.after(() => rm(api.resourcesDir, { recursive: true, force: true }));

  const created = await request(api.baseUrl, '/topics', json('POST', {
    title: '  MCP 与 API 网关区别  ',
    question: '  MCP 与普通 API 网关的边界是什么？\n\n```js\nconst tool = true;\n```  ',
  }));
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.title, 'MCP 与 API 网关区别');
  assert.equal(created.body.data.externalAnswerCount, 0);
  const topic = created.body.data;
  const topicDirectory = join(api.resourcesDir, 'topics', topic.id);
  const topicOnDisk = JSON.parse(await readFile(join(topicDirectory, 'topic.json'), 'utf8'));
  assert.equal(topicOnDisk.question, 'MCP 与普通 API 网关的边界是什么？\n\n```js\nconst tool = true;\n```');

  const chatGptAnswer = await request(
    api.baseUrl,
    `/topics/${topic.id}/external-answers`,
    json('POST', { source: 'ChatGPT', content: '# 第一份答案\n\n工具协议面向模型。' }),
  );
  assert.equal(chatGptAnswer.response.status, 201);

  const customAnswer = await request(
    api.baseUrl,
    `/topics/${topic.id}/external-answers`,
    json('POST', { source: '架构周刊', content: '第二份外部资料。' }),
  );
  assert.equal(customAnswer.response.status, 201);

  const understanding = await request(
    api.baseUrl,
    `/topics/${topic.id}/understandings`,
    json('POST', { content: '我的第一版理解。' }),
  );
  assert.equal(understanding.response.status, 201);

  const detail = await request(api.baseUrl, `/topics/${topic.id}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.data.externalAnswers.length, 2);
  assert.equal(detail.body.data.understandings.length, 1);
  assert.equal(detail.body.data.externalAnswerCount, 2);
  assert.equal(detail.body.data.understandingCount, 1);
  assert.ok(detail.body.data.updatedAt > topic.updatedAt);

  const answerFile = join(
    topicDirectory,
    'external-answers',
    `${chatGptAnswer.body.data.id}.json`,
  );
  const understandingFile = join(
    topicDirectory,
    'understandings',
    `${understanding.body.data.id}.json`,
  );
  await access(answerFile);
  await access(understandingFile);

  const patchedAnswer = await request(
    api.baseUrl,
    `/topics/${topic.id}/external-answers/${chatGptAnswer.body.data.id}`,
    json('PATCH', { content: '修正后的外部答案。' }),
  );
  assert.equal(patchedAnswer.response.status, 200);
  assert.equal(patchedAnswer.body.data.createdAt, chatGptAnswer.body.data.createdAt);
  assert.ok(patchedAnswer.body.data.updatedAt > chatGptAnswer.body.data.updatedAt);

  const patchedUnderstanding = await request(
    api.baseUrl,
    `/topics/${topic.id}/understandings/${understanding.body.data.id}`,
    json('PATCH', { content: '纠正错别字后的第一版理解。' }),
  );
  assert.equal(patchedUnderstanding.response.status, 200);
  assert.equal(patchedUnderstanding.body.data.createdAt, understanding.body.data.createdAt);

  const patchedTopic = await request(
    api.baseUrl,
    `/topics/${topic.id}`,
    json('PATCH', { title: 'MCP 与 API Gateway 的边界' }),
  );
  assert.equal(patchedTopic.response.status, 200);
  assert.equal(patchedTopic.body.data.createdAt, topic.createdAt);

  const searched = await request(api.baseUrl, '/topics?query=gateway');
  assert.equal(searched.response.status, 200);
  assert.equal(searched.body.data.total, 1);
  assert.equal(searched.body.data.items[0].externalAnswerCount, 2);

  const searchedWithQ = await request(api.baseUrl, '/topics?q=gateway');
  assert.equal(searchedWithQ.response.status, 200);
  assert.equal(searchedWithQ.body.data.query, 'gateway');
  assert.equal(searchedWithQ.body.data.total, 1);

  const conflictingSearch = await request(api.baseUrl, '/topics?q=gateway&query=MCP');
  assert.equal(conflictingSearch.response.status, 400);
  assert.equal(conflictingSearch.body.error.code, 'VALIDATION_ERROR');

  const noMatch = await request(api.baseUrl, '/topics?query=不存在');
  assert.equal(noMatch.body.data.total, 0);

  const deletedAnswer = await request(
    api.baseUrl,
    `/topics/${topic.id}/external-answers/${customAnswer.body.data.id}`,
    { method: 'DELETE' },
  );
  assert.equal(deletedAnswer.response.status, 204);

  const deletedUnderstanding = await request(
    api.baseUrl,
    `/topics/${topic.id}/understandings/${understanding.body.data.id}`,
    { method: 'DELETE' },
  );
  assert.equal(deletedUnderstanding.response.status, 204);

  const afterDeletes = await request(api.baseUrl, `/topics/${topic.id}`);
  assert.equal(afterDeletes.body.data.externalAnswerCount, 1);
  assert.equal(afterDeletes.body.data.understandingCount, 0);

  for (const directory of ['external-answers', 'understandings']) {
    const files = await readdir(join(topicDirectory, directory));
    assert.equal(files.some((file) => file.endsWith('.tmp')), false);
    assert.equal(files.some((file) => file.startsWith('.deleted-')), false);
  }
});

test('resources survive restart and topic deletion removes the aggregate', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-persistence-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const first = await createTestApi(t, resourcesDir);

  const created = await request(first.baseUrl, '/topics', json('POST', {
    title: 'Promise.all 快速失败',
    question: '为什么其中一个 Promise 拒绝后会立刻失败？',
  }));
  const topicId = created.body.data.id;
  await request(
    first.baseUrl,
    `/topics/${topicId}/understandings`,
    json('POST', { content: '第一版理解仍需补充。' }),
  );
  await first.stop('restart test');

  const second = await createTestApi(t, resourcesDir);
  const restored = await request(second.baseUrl, `/topics/${topicId}`);
  assert.equal(restored.response.status, 200);
  assert.equal(restored.body.data.title, 'Promise.all 快速失败');
  assert.equal(restored.body.data.understandings.length, 1);

  const removed = await request(second.baseUrl, `/topics/${topicId}`, { method: 'DELETE' });
  assert.equal(removed.response.status, 204);
  const missing = await request(second.baseUrl, `/topics/${topicId}`);
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'TOPIC_NOT_FOUND');
  await assert.rejects(access(join(resourcesDir, 'topics', topicId)));
});

test('validation blocks unknown fields, blank content, and unsafe identifiers', async (t) => {
  const api = await createTestApi(t);
  t.after(() => rm(api.resourcesDir, { recursive: true, force: true }));

  const unknownField = await request(api.baseUrl, '/topics', json('POST', {
    title: '标题',
    question: '问题',
    createdAt: '2020-01-01T00:00:00.000Z',
  }));
  assert.equal(unknownField.response.status, 400);
  assert.equal(unknownField.body.error.code, 'VALIDATION_ERROR');

  const blank = await request(api.baseUrl, '/topics', json('POST', {
    title: '   ',
    question: '问题',
  }));
  assert.equal(blank.response.status, 400);

  const unsafeId = await request(api.baseUrl, '/topics/not-a-uuid');
  assert.equal(unsafeId.response.status, 400);
  assert.equal(unsafeId.body.error.code, 'VALIDATION_ERROR');

  const created = await request(api.baseUrl, '/topics', json('POST', {
    title: '可验证主题',
    question: '用于验证更新。',
  }));
  const emptyPatch = await request(
    api.baseUrl,
    `/topics/${created.body.data.id}`,
    json('PATCH', {}),
  );
  assert.equal(emptyPatch.response.status, 400);

  const blankSource = await request(
    api.baseUrl,
    `/topics/${created.body.data.id}/external-answers`,
    json('POST', { source: '', content: '内容' }),
  );
  assert.equal(blankSource.response.status, 400);

  const missingChild = await request(
    api.baseUrl,
    `/topics/${created.body.data.id}/understandings/4e47f5b8-9df1-4d89-9030-e23ab89ff111`,
    json('PATCH', { content: '不存在' }),
  );
  assert.equal(missingChild.response.status, 404);
  assert.equal(missingChild.body.error.code, 'UNDERSTANDING_NOT_FOUND');
});

test('concurrent writes are serialized without losing entries', async (t) => {
  const api = await createTestApi(t);
  t.after(() => rm(api.resourcesDir, { recursive: true, force: true }));

  const created = await request(api.baseUrl, '/topics', json('POST', {
    title: '并发写入验证',
    question: '文件事务是否会覆盖其他追加？',
  }));
  const topicId = created.body.data.id;
  const writes = await Promise.all(Array.from({ length: 16 }, (_, index) => request(
    api.baseUrl,
    `/topics/${topicId}/understandings`,
    json('POST', { content: `阶段理解 ${index + 1}` }),
  )));

  assert.equal(writes.every(({ response }) => response.status === 201), true);
  const detail = await request(api.baseUrl, `/topics/${topicId}`);
  assert.equal(detail.body.data.understandings.length, 16);
  assert.equal(new Set(detail.body.data.understandings.map(({ id }) => id)).size, 16);

  const files = await readdir(join(
    api.resourcesDir,
    'topics',
    topicId,
    'understandings',
  ));
  assert.equal(files.filter((file) => file.endsWith('.json')).length, 16);
  assert.equal(files.some((file) => file.endsWith('.tmp')), false);
});

test('list counts child files without loading long bodies and missing collections are corruption', async (t) => {
  const api = await createTestApi(t);
  t.after(() => rm(api.resourcesDir, { recursive: true, force: true }));

  const created = await request(api.baseUrl, '/topics', json('POST', {
    title: '资源完整性验证',
    question: '列表与详情应该承担不同的读取成本。',
  }));
  const topicId = created.body.data.id;
  const answer = await request(
    api.baseUrl,
    `/topics/${topicId}/external-answers`,
    json('POST', { source: 'Article', content: '一段外部资料。' }),
  );
  const topicDirectory = join(api.resourcesDir, 'topics', topicId);
  await writeFile(
    join(topicDirectory, 'external-answers', `${answer.body.data.id}.json`),
    '{broken-json',
    'utf8',
  );

  const list = await request(api.baseUrl, '/topics');
  assert.equal(list.response.status, 200);
  assert.equal(list.body.data.items[0].externalAnswerCount, 1);

  const corruptDetail = await request(api.baseUrl, `/topics/${topicId}`);
  assert.equal(corruptDetail.response.status, 500);
  assert.equal(corruptDetail.body.error.code, 'CORRUPT_RESOURCE');

  await rm(join(topicDirectory, 'understandings'), { recursive: true });
  const corruptList = await request(api.baseUrl, '/topics');
  assert.equal(corruptList.response.status, 500);
  assert.equal(corruptList.body.error.code, 'CORRUPT_RESOURCE');
});
