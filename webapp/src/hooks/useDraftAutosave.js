import { useCallback, useEffect, useRef, useState } from 'react';

import { saveTopicDraft } from '../services/topics.js';

export const DRAFT_AUTOSAVE_INTERVAL_MS = 3 * 60 * 1000;

export function draftSignature(draft) {
  if (!draft) return '';
  return JSON.stringify({
    targetType: draft.targetType,
    targetId: draft.targetId ?? null,
    operation: draft.operation,
    values: draft.values,
    baseUpdatedAt: draft.baseUpdatedAt,
  });
}

export default function useDraftAutosave({
  enabled,
  topicId,
  sessionKey,
  draft,
  initialSavedDraft,
  onSaved,
}) {
  const latestRef = useRef({ draft, signature: draftSignature(draft) });
  const savedSignatureRef = useRef(draftSignature(initialSavedDraft));
  const inFlightRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  const generationRef = useRef(0);
  const [state, setState] = useState({ status: 'idle', savedAt: initialSavedDraft?.updatedAt ?? null, error: '' });

  useEffect(() => {
    latestRef.current = { draft, signature: draftSignature(draft) };
  }, [draft]);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const resetBaseline = useCallback((nextDraft, savedAt = null) => {
    savedSignatureRef.current = draftSignature(nextDraft);
    setState({ status: 'idle', savedAt, error: '' });
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    savedSignatureRef.current = draftSignature(initialSavedDraft);
    inFlightRef.current = false;
    setState({ status: 'idle', savedAt: initialSavedDraft?.updatedAt ?? null, error: '' });
    if (!enabled || !topicId || !draft) return undefined;

    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      const latest = latestRef.current;
      if (!latest.draft || latest.signature === savedSignatureRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      setState((current) => ({ ...current, status: 'saving', error: '' }));
      try {
        const saved = await saveTopicDraft(topicId, latest.draft, { signal: controller.signal });
        if (generationRef.current !== generation || controller.signal.aborted) return;
        savedSignatureRef.current = latest.signature;
        setState({ status: 'saved', savedAt: saved.updatedAt, error: '' });
        onSavedRef.current?.(saved);
      } catch (error) {
        if (generationRef.current === generation && error.name !== 'AbortError') {
          setState({ status: 'error', savedAt: null, error: error.message });
        }
      } finally {
        if (generationRef.current === generation) inFlightRef.current = false;
      }
    }, DRAFT_AUTOSAVE_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [enabled, sessionKey, topicId]);

  return { ...state, resetBaseline };
}
