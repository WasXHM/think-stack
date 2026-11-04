import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FileTopicStore } from '../src/storage/topic-store.js';

test('topic visibility and ownership are enforced without backfilling legacy records', async (t) => {
  const resourcesDir = await mkdtemp(join(tmpdir(), 'think-stack-privacy-'));
  t.after(() => rm(resourcesDir, { recursive: true, force: true }));
  const store = new FileTopicStore({ resourcesDir });

  const publicTopic = await store.createTopic({
    title: 'Public topic',
    question: 'Visible to everyone',
  }, 'admin');
  const privateTopic = await store.createTopic({
    title: 'Alice private topic',
    question: 'Visible only to Alice',
    isPublic: false,
  }, 'alice');

  assert.equal(publicTopic.ownerUsername, 'admin');
  assert.equal(publicTopic.isPublic, true);
  assert.equal(privateTopic.ownerUsername, 'alice');
  assert.equal(privateTopic.isPublic, false);

  assert.deepEqual(
    (await store.listTopics()).items.map(({ id }) => id),
    [publicTopic.id],
  );
  assert.deepEqual(
    new Set((await store.listTopics({ viewerUsername: 'alice' })).items.map(({ id }) => id)),
    new Set([publicTopic.id, privateTopic.id]),
  );
  assert.deepEqual(
    (await store.listTopics({ viewerUsername: 'bob' })).items.map(({ id }) => id),
    [publicTopic.id],
  );

  await assert.rejects(store.getTopic(privateTopic.id), { status: 404, code: 'TOPIC_NOT_FOUND' });
  await assert.rejects(
    store.getTopic(privateTopic.id, { viewerUsername: 'bob' }),
    { status: 404, code: 'TOPIC_NOT_FOUND' },
  );
  assert.equal(
    (await store.getTopic(privateTopic.id, { viewerUsername: 'alice' })).id,
    privateTopic.id,
  );

  await assert.rejects(
    store.updateTopic(publicTopic.id, { title: 'Not allowed' }, 'bob'),
    { status: 403, code: 'TOPIC_FORBIDDEN' },
  );
  await assert.rejects(
    store.createUnderstanding(privateTopic.id, { content: 'Not allowed' }, 'bob'),
    { status: 404, code: 'TOPIC_NOT_FOUND' },
  );

  await store.updateTopic(privateTopic.id, { isPublic: true }, 'alice');
  assert.equal((await store.getTopic(privateTopic.id)).isPublic, true);

  const legacyFile = join(resourcesDir, 'topics', publicTopic.id, 'topic.json');
  const legacyRecord = JSON.parse(await readFile(legacyFile, 'utf8'));
  delete legacyRecord.ownerUsername;
  delete legacyRecord.isPublic;
  const legacyRaw = `${JSON.stringify(legacyRecord, null, 2)}\n`;
  await writeFile(legacyFile, legacyRaw);

  const legacyTopic = await store.getTopic(publicTopic.id);
  assert.equal(legacyTopic.ownerUsername, 'admin');
  assert.equal(legacyTopic.isPublic, true);
  assert.equal(await readFile(legacyFile, 'utf8'), legacyRaw);
});
