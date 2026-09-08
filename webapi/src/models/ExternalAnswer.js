import { AppError } from '../core/errors.js';
import { isUuid } from '../core/ids.js';

function invalidRecord(field) {
  throw new AppError({
    status: 500,
    code: 'CORRUPT_RESOURCE',
    message: 'A stored external answer resource is invalid',
    expose: false,
    cause: new TypeError(`Invalid ExternalAnswer.${field}`),
  });
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    invalidRecord(field);
  }
  return value;
}

function timestamp(value, field) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    invalidRecord(field);
  }
  return new Date(parsed).toISOString();
}

export function createExternalAnswerRecord({ id, topicId, source, content, timestamp: createdAt }) {
  return {
    id,
    topicId,
    source,
    content,
    createdAt,
    updatedAt: createdAt,
  };
}

export function updateExternalAnswerRecord(answer, changes, updatedAt) {
  return { ...answer, ...changes, updatedAt };
}

export function deserializeExternalAnswer(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalidRecord('record');
  }
  if (!isUuid(value.id)) {
    invalidRecord('id');
  }
  if (!isUuid(value.topicId)) {
    invalidRecord('topicId');
  }

  return {
    id: value.id.toLowerCase(),
    topicId: value.topicId.toLowerCase(),
    source: requiredString(value.source, 'source'),
    content: requiredString(value.content, 'content'),
    createdAt: timestamp(value.createdAt, 'createdAt'),
    updatedAt: timestamp(value.updatedAt, 'updatedAt'),
  };
}

export function serializeExternalAnswer(answer) {
  return {
    id: answer.id,
    topicId: answer.topicId,
    source: answer.source,
    content: answer.content,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
  };
}
