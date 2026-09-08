import { AppError } from '../core/errors.js';
import { isUuid } from '../core/ids.js';

function invalidRecord(field) {
  throw new AppError({
    status: 500,
    code: 'CORRUPT_RESOURCE',
    message: 'A stored topic resource is invalid',
    expose: false,
    cause: new TypeError(`Invalid Topic.${field}`),
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

export function createTopicRecord({ id, title, question, timestamp: createdAt }) {
  return {
    id,
    title,
    question,
    createdAt,
    updatedAt: createdAt,
  };
}

export function updateTopicRecord(topic, changes, updatedAt) {
  return {
    ...topic,
    ...changes,
    updatedAt,
  };
}

export function deserializeTopic(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalidRecord('record');
  }
  if (!isUuid(value.id)) {
    invalidRecord('id');
  }

  return {
    id: value.id.toLowerCase(),
    title: requiredString(value.title, 'title'),
    question: requiredString(value.question, 'question'),
    createdAt: timestamp(value.createdAt, 'createdAt'),
    updatedAt: timestamp(value.updatedAt, 'updatedAt'),
  };
}

export function serializeTopic(topic) {
  return {
    id: topic.id,
    title: topic.title,
    question: topic.question,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}

export function assembleTopic(topic, externalAnswers, understandings) {
  return {
    ...topic,
    externalAnswerCount: externalAnswers.length,
    understandingCount: understandings.length,
    externalAnswers,
    understandings,
  };
}

export function summarizeQuestion(markdown, maximumLength = 180) {
  const summary = markdown.replace(/\s+/g, ' ').trim();
  return summary.length <= maximumLength
    ? summary
    : `${summary.slice(0, maximumLength - 1).trimEnd()}…`;
}

export function toTopicListItem(topic) {
  return {
    id: topic.id,
    title: topic.title,
    question: topic.question,
    questionSummary: summarizeQuestion(topic.question),
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    externalAnswerCount: topic.externalAnswerCount ?? topic.externalAnswers?.length ?? 0,
    understandingCount: topic.understandingCount ?? topic.understandings?.length ?? 0,
  };
}
