import assert from 'node:assert/strict';
import test from 'node:test';
import { clearEntryDraft, entryDraftKey, readEntryDraft, saveEntryDraft } from '../src/utils/entry-drafts.js';

test('draft keys are scoped by topic and entry type', () => {
  assert.equal(entryDraftKey('topic/1', 'answer'), 'think-stack:entry-draft:v1:topic%2F1:answer');
  assert.notEqual(entryDraftKey('topic', 'answer'), entryDraftKey('topic', 'understanding'));
  assert.equal(entryDraftKey('topic', 'edit'), null);
  assert.equal(readEntryDraft('topic', 'answer'), null);
  assert.equal(saveEntryDraft('topic', 'answer', { content: 'draft' }), false);
});

test('existing session drafts remain readable and include a comparable save time', (t) => {
  const values = new Map();
  global.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  t.after(() => { delete global.window; });
  assert.equal(saveEntryDraft('topic', 'answer', {
    content: 'local draft', sourceChoice: 'Other', customSource: 'Local source',
  }), true);
  const draft = readEntryDraft('topic', 'answer');
  assert.equal(draft.content, 'local draft');
  assert.equal(draft.sourceChoice, 'Other');
  assert.ok(Number.isFinite(Date.parse(draft.savedAt)));
  assert.equal(clearEntryDraft('topic', 'answer'), true);
  assert.equal(readEntryDraft('topic', 'answer'), null);
});
