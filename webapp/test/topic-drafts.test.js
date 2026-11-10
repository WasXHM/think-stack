import assert from 'node:assert/strict';
import test from 'node:test';

import { DRAFT_AUTOSAVE_INTERVAL_MS, draftSignature } from '../src/hooks/useDraftAutosave.js';
import { draftMatches, isCurrentTopicDraft, isNewerTopicDraft } from '../src/utils/topic-drafts.js';

const topic = {
  updatedAt: '2026-11-06T08:00:00.000Z',
  externalAnswers: [{ id: 'answer-1', updatedAt: '2026-11-06T08:01:00.000Z' }],
  understandings: [],
};

test('draft autosave interval is three minutes and signatures represent editable state', () => {
  assert.equal(DRAFT_AUTOSAVE_INTERVAL_MS, 180_000);
  const draft = {
    targetType: 'topic', targetId: null, operation: 'update',
    values: { title: 'Draft' }, baseUpdatedAt: topic.updatedAt,
  };
  assert.equal(draftSignature(draft), draftSignature({ ...draft, updatedAt: 'ignored' }));
  assert.notEqual(draftSignature(draft), draftSignature({ ...draft, values: { title: 'Changed' } }));
});

test('draft helpers match targets and reject stale or older drafts', () => {
  const draft = {
    targetType: 'external-answer',
    targetId: 'answer-1',
    operation: 'update',
    baseUpdatedAt: '2026-11-06T08:01:00.000Z',
    updatedAt: '2026-11-06T08:04:00.000Z',
    isCurrent: true,
  };
  assert.equal(draftMatches(draft, {
    targetType: 'external-answer', targetId: 'answer-1', operation: 'update',
  }), true);
  assert.equal(isCurrentTopicDraft(topic, draft), true);
  assert.equal(isNewerTopicDraft(topic, draft), true);
  assert.equal(isCurrentTopicDraft(topic, { ...draft, baseUpdatedAt: topic.updatedAt }), false);
  assert.equal(isNewerTopicDraft(topic, { ...draft, updatedAt: draft.baseUpdatedAt }), false);
});
