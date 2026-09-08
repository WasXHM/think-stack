import { AppError } from '../core/errors.js';
import { isUuid } from '../core/ids.js';

function invalidRecord(field) {
  throw new AppError({
    status: 500,
    code: 'CORRUPT_RESOURCE',
    message: 'A stored understanding resource is invalid',
    expose: false,
    cause: new TypeError(`Invalid Understanding.${field}`),
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

export function createUnderstandingRecord({ id, topicId, content, timestamp: createdAt }) {
  return {
    id,
    topicId,
    content,
    createdAt,
    updatedAt: createdAt,
  };
}

export function updateUnderstandingRecord(understanding, changes, updatedAt) {
  return { ...understanding, ...changes, updatedAt };
}

export function deserializeUnderstanding(value) {
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
    content: requiredString(value.content, 'content'),
    createdAt: timestamp(value.createdAt, 'createdAt'),
    updatedAt: timestamp(value.updatedAt, 'updatedAt'),
  };
}

export function serializeUnderstanding(understanding) {
  return {
    id: understanding.id,
    topicId: understanding.topicId,
    content: understanding.content,
    createdAt: understanding.createdAt,
    updatedAt: understanding.updatedAt,
  };
}
