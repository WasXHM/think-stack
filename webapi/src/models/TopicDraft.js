import { AppError } from '../core/errors.js';
import { isUuid } from '../core/ids.js';

export const DRAFT_TARGET_TYPES = ['topic', 'external-answer', 'understanding'];

function invalidRecord(field) {
  throw new AppError({
    status: 500,
    code: 'CORRUPT_RESOURCE',
    message: 'A stored topic draft resource is invalid',
    expose: false,
    cause: new TypeError(`Invalid TopicDraft.${field}`),
  });
}

function timestamp(value, field) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed)) invalidRecord(field);
  return new Date(parsed).toISOString();
}

function valuesFor(targetType, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidRecord('values');
  if (targetType === 'topic') {
    if (
      typeof value.title !== 'string'
      || typeof value.question !== 'string'
      || typeof value.categoryId !== 'string'
      || typeof value.isPublic !== 'boolean'
    ) invalidRecord('values');
    return {
      title: value.title,
      question: value.question,
      categoryId: value.categoryId,
      isPublic: value.isPublic,
    };
  }
  if (targetType === 'external-answer') {
    if (typeof value.source !== 'string' || typeof value.content !== 'string') invalidRecord('values');
    return { source: value.source, content: value.content };
  }
  if (typeof value.content !== 'string') invalidRecord('values');
  return { content: value.content };
}

export function createTopicDraftRecord({
  topicId,
  targetType,
  targetId,
  operation,
  values,
  locale,
  baseUpdatedAt,
  createdAt,
  updatedAt,
}) {
  return {
    topicId,
    targetType,
    targetId,
    operation,
    values,
    locale,
    baseUpdatedAt,
    createdAt,
    updatedAt,
  };
}

export function deserializeTopicDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidRecord('record');
  if (!isUuid(value.topicId)) invalidRecord('topicId');
  if (!DRAFT_TARGET_TYPES.includes(value.targetType)) invalidRecord('targetType');
  if (!['create', 'update'].includes(value.operation)) invalidRecord('operation');
  const targetId = value.targetId == null ? null : value.targetId;
  if (value.targetType === 'topic') {
    if (value.operation !== 'update' || targetId !== null) invalidRecord('target');
  } else if (value.operation === 'create') {
    if (targetId !== null) invalidRecord('targetId');
  } else if (!isUuid(targetId)) {
    invalidRecord('targetId');
  }
  if (!['zh', 'en'].includes(value.locale)) invalidRecord('locale');
  return {
    topicId: value.topicId.toLowerCase(),
    targetType: value.targetType,
    targetId: targetId?.toLowerCase() ?? null,
    operation: value.operation,
    values: valuesFor(value.targetType, value.values),
    locale: value.locale,
    baseUpdatedAt: timestamp(value.baseUpdatedAt, 'baseUpdatedAt'),
    createdAt: timestamp(value.createdAt, 'createdAt'),
    updatedAt: timestamp(value.updatedAt, 'updatedAt'),
  };
}

export function serializeTopicDraft(draft) {
  return {
    topicId: draft.topicId,
    targetType: draft.targetType,
    targetId: draft.targetId,
    operation: draft.operation,
    values: draft.values,
    locale: draft.locale,
    baseUpdatedAt: draft.baseUpdatedAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export function toTopicDraftSummary(draft) {
  if (!draft) return null;
  return {
    targetType: draft.targetType,
    targetId: draft.targetId,
    operation: draft.operation,
    locale: draft.locale,
    baseUpdatedAt: draft.baseUpdatedAt,
    updatedAt: draft.updatedAt,
    isCurrent: draft.isCurrent !== false,
  };
}
