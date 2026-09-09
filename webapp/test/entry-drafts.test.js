import assert from 'node:assert/strict';
import test from 'node:test';
import { entryDraftKey, readEntryDraft, saveEntryDraft } from '../src/utils/entry-drafts.js';

test('draft keys are scoped by topic and entry type', () => {
  assert.equal(entryDraftKey('topic/1', 'answer'), 'think-stack:entry-draft:v1:topic%2F1:answer');
  assert.notEqual(entryDraftKey('topic', 'answer'), entryDraftKey('topic', 'understanding'));
  assert.equal(entryDraftKey('topic', 'edit'), null);
  assert.equal(readEntryDraft('topic', 'answer'), null);
  assert.equal(saveEntryDraft('topic', 'answer', { content: 'draft' }), false);
});
