export function draftMatches(draft, { targetType, targetId = null, operation }) {
  return Boolean(
    draft
    && draft.targetType === targetType
    && (draft.targetId ?? null) === targetId
    && draft.operation === operation,
  );
}

export function topicDraftTargetUpdatedAt(topic, draft) {
  if (!topic || !draft) return null;
  if (draft.targetType === 'topic' || draft.operation === 'create') return topic.updatedAt ?? null;
  const collection = draft.targetType === 'external-answer' ? topic.externalAnswers : topic.understandings;
  return collection?.find((entry) => entry.id === draft.targetId)?.updatedAt ?? null;
}

export function isCurrentTopicDraft(topic, draft) {
  if (!draft || draft.isCurrent === false) return false;
  const targetUpdatedAt = topicDraftTargetUpdatedAt(topic, draft);
  return Boolean(targetUpdatedAt && targetUpdatedAt === draft.baseUpdatedAt);
}

export function isNewerTopicDraft(topic, draft) {
  if (!isCurrentTopicDraft(topic, draft)) return false;
  return Date.parse(draft.updatedAt) > Date.parse(draft.baseUpdatedAt);
}
