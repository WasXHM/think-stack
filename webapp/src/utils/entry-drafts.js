const DRAFT_PREFIX = 'think-stack:entry-draft:v1';

function storage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function entryDraftKey(topicId, kind) {
  const type = kind === 'answer' ? 'answer' : kind === 'understanding' ? 'understanding' : null;
  if (!topicId || !type) return null;
  return `${DRAFT_PREFIX}:${encodeURIComponent(String(topicId))}:${type}`;
}

export function readEntryDraft(topicId, kind) {
  const key = entryDraftKey(topicId, kind);
  const store = storage();
  if (!key || !store) return null;
  try {
    const value = JSON.parse(store.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    return {
      content: typeof value.content === 'string' ? value.content : '',
      sourceChoice: typeof value.sourceChoice === 'string' ? value.sourceChoice : '',
      customSource: typeof value.customSource === 'string' ? value.customSource : '',
    };
  } catch {
    return null;
  }
}

export function saveEntryDraft(topicId, kind, draft) {
  const key = entryDraftKey(topicId, kind);
  const store = storage();
  if (!key || !store) return false;
  const value = {
    content: String(draft?.content ?? ''),
    sourceChoice: String(draft?.sourceChoice ?? ''),
    customSource: String(draft?.customSource ?? ''),
    savedAt: new Date().toISOString(),
  };
  if (!value.content.trim() && !value.sourceChoice && !value.customSource.trim()) {
    clearEntryDraft(topicId, kind);
    return true;
  }
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearEntryDraft(topicId, kind) {
  const key = entryDraftKey(topicId, kind);
  const store = storage();
  if (!key || !store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
