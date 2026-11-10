import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FileTopicStore } from '../src/storage/topic-store.js';

test('a topic keeps one owner-only draft and formal saves consume the matching draft', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-drafts-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const store = new FileTopicStore({ resourcesDir });
  const owner = 'admin';
  const topic = await store.createTopic({ title: '正式标题', question: '正式问题' }, owner);
  const topicDirectory = join(resourcesDir, 'topics', topic.id);
  const firstInput = {
    targetType: 'topic',
    targetId: null,
    operation: 'update',
    values: {
      title: '草稿标题',
      question: '草稿问题',
      categoryId: 'default',
      isPublic: false,
    },
    baseUpdatedAt: topic.updatedAt,
  };

  const first = await store.saveDraft(topic.id, firstInput, owner);
  assert.equal(first.values.title, '草稿标题');
  assert.equal(first.isCurrent, true);
  assert.deepEqual((await store.getTopic(topic.id)).draft, null, 'anonymous readers never receive drafts');
  const ownerDetail = await store.getTopic(topic.id, { viewerUsername: owner });
  assert.equal(ownerDetail.title, '正式标题', 'drafts do not replace the formal detail response');
  assert.equal(ownerDetail.draft.values.title, '草稿标题');
  const ownerListDraft = (await store.listTopics({ viewerUsername: owner })).items[0].draft;
  assert.equal(ownerListDraft.isCurrent, true);
  assert.equal(Object.hasOwn(ownerListDraft, 'values'), false, 'list responses expose only draft status');
  assert.equal((await store.listTopics()).items[0].draft, null);

  const second = await store.saveDraft(topic.id, {
    ...firstInput,
    values: { ...firstInput.values, title: '覆盖后的草稿' },
  }, owner);
  assert.equal(second.createdAt, first.createdAt);
  assert.ok(second.updatedAt > first.updatedAt);
  assert.equal(JSON.parse(await readFile(join(topicDirectory, 'draft.json'), 'utf8')).values.title, '覆盖后的草稿');
  assert.equal((await readdir(topicDirectory)).filter((name) => name === 'draft.json').length, 1);

  await assert.rejects(store.saveDraft(topic.id, firstInput, 'someone-else'), {
    status: 403,
    code: 'TOPIC_FORBIDDEN',
  });
  await assert.rejects(store.saveDraft(topic.id, { ...firstInput, baseUpdatedAt: '2020-01-01T00:00:00.000Z' }, owner), {
    status: 409,
    code: 'DRAFT_CONFLICT',
  });

  const savedTopic = await store.updateTopic(topic.id, {
    title: second.values.title,
    question: second.values.question,
    categoryId: second.values.categoryId,
    isPublic: second.values.isPublic,
  }, owner);
  assert.equal(savedTopic.draft, null);
  await assert.rejects(access(join(topicDirectory, 'draft.json')));

  const createDraft = await store.saveDraft(topic.id, {
    targetType: 'external-answer',
    targetId: null,
    operation: 'create',
    values: { source: 'ChatGPT', content: '尚未提交的回答' },
    baseUpdatedAt: savedTopic.updatedAt,
  }, owner);
  assert.equal(createDraft.values.content, '尚未提交的回答');
  const answer = await store.createExternalAnswer(topic.id, createDraft.values, owner);
  assert.equal((await store.getTopic(topic.id, { viewerUsername: owner })).draft, null);

  const updateDraft = await store.saveDraft(topic.id, {
    targetType: 'external-answer',
    targetId: answer.id,
    operation: 'update',
    values: { source: answer.source, content: '修订草稿' },
    baseUpdatedAt: answer.updatedAt,
  }, owner);
  await store.updateExternalAnswer(topic.id, answer.id, updateDraft.values, owner);
  assert.equal((await store.getTopic(topic.id, { viewerUsername: owner })).draft, null);
});

test('deleting a draft is idempotent and does not modify formal content', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-draft-delete-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const store = new FileTopicStore({ resourcesDir });
  const topic = await store.createTopic({ title: '标题', question: '问题' }, 'admin');
  await store.saveDraft(topic.id, {
    targetType: 'understanding',
    targetId: null,
    operation: 'create',
    values: { content: '草稿' },
    baseUpdatedAt: topic.updatedAt,
  }, 'admin');
  await store.deleteDraft(topic.id, 'admin');
  await store.deleteDraft(topic.id, 'admin');
  const detail = await store.getTopic(topic.id, { viewerUsername: 'admin' });
  assert.equal(detail.draft, null);
  assert.equal(detail.title, '标题');
  assert.equal(detail.understandings.length, 0);
});
