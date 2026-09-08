import { ValidationError } from '../../core/errors.js';
import { validateUuid } from '../../core/ids.js';

const MAX_TITLE_LENGTH = 200;
const MAX_SOURCE_LENGTH = 120;
const MAX_MARKDOWN_LENGTH = 500_000;
const MAX_QUERY_LENGTH = 200;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateBody(body, allowedFields) {
  if (!isPlainObject(body)) {
    throw new ValidationError('Request body must be a JSON object', [
      { field: 'body', message: 'Must be a JSON object' },
    ]);
  }

  const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    throw new ValidationError('Request body contains unknown fields', unknownFields.map((field) => ({
      field,
      message: 'Field is not allowed',
    })));
  }
}

function requiredString(value, field, maximumLength) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} is required`, [
      { field, message: 'Must be a string' },
    ]);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(`${field} is required`, [
      { field, message: 'Must not be empty' },
    ]);
  }

  if (normalized.length > maximumLength) {
    throw new ValidationError(`${field} is too long`, [
      { field, message: `Must contain at most ${maximumLength} characters` },
    ]);
  }

  return normalized;
}

function optionalString(body, field, maximumLength) {
  if (!Object.hasOwn(body, field)) {
    return undefined;
  }

  return requiredString(body[field], field, maximumLength);
}

function requireAtLeastOneField(value) {
  if (Object.keys(value).length === 0) {
    throw new ValidationError('At least one editable field is required', [
      { field: 'body', message: 'Provide at least one editable field' },
    ]);
  }

  return value;
}

export function filterListTopicsQuery(query = {}) {
  const hasQuery = Object.hasOwn(query, 'query');
  const hasQ = Object.hasOwn(query, 'q');
  const rawQuery = hasQ ? query.q : (query.query ?? '');

  if (typeof rawQuery !== 'string') {
    throw new ValidationError('query must be a string', [
      { field: 'query', message: 'Must be a string' },
    ]);
  }

  const normalizedQuery = rawQuery.trim();
  if (hasQ && hasQuery) {
    if (typeof query.query !== 'string' || query.query.trim() !== normalizedQuery) {
      throw new ValidationError('q and query must not conflict', [
        { field: 'query', message: 'Use either q or query, or provide the same value' },
      ]);
    }
  }

  if (normalizedQuery.length > MAX_QUERY_LENGTH) {
    throw new ValidationError('query is too long', [
      { field: 'query', message: `Must contain at most ${MAX_QUERY_LENGTH} characters` },
    ]);
  }

  return { query: normalizedQuery };
}

export function filterCreateTopic(body) {
  validateBody(body, ['title', 'question']);
  return {
    title: requiredString(body.title, 'title', MAX_TITLE_LENGTH),
    question: requiredString(body.question, 'question', MAX_MARKDOWN_LENGTH),
  };
}

export function filterUpdateTopic(body) {
  validateBody(body, ['title', 'question']);
  return requireAtLeastOneField({
    ...(Object.hasOwn(body, 'title')
      ? { title: optionalString(body, 'title', MAX_TITLE_LENGTH) }
      : {}),
    ...(Object.hasOwn(body, 'question')
      ? { question: optionalString(body, 'question', MAX_MARKDOWN_LENGTH) }
      : {}),
  });
}

export function filterCreateExternalAnswer(body) {
  validateBody(body, ['source', 'content']);
  return {
    source: requiredString(body.source, 'source', MAX_SOURCE_LENGTH),
    content: requiredString(body.content, 'content', MAX_MARKDOWN_LENGTH),
  };
}

export function filterUpdateExternalAnswer(body) {
  validateBody(body, ['source', 'content']);
  return requireAtLeastOneField({
    ...(Object.hasOwn(body, 'source')
      ? { source: optionalString(body, 'source', MAX_SOURCE_LENGTH) }
      : {}),
    ...(Object.hasOwn(body, 'content')
      ? { content: optionalString(body, 'content', MAX_MARKDOWN_LENGTH) }
      : {}),
  });
}

export function filterCreateUnderstanding(body) {
  validateBody(body, ['content']);
  return {
    content: requiredString(body.content, 'content', MAX_MARKDOWN_LENGTH),
  };
}

export function filterUpdateUnderstanding(body) {
  validateBody(body, ['content']);
  return requireAtLeastOneField({
    ...(Object.hasOwn(body, 'content')
      ? { content: optionalString(body, 'content', MAX_MARKDOWN_LENGTH) }
      : {}),
  });
}

export function filterTopicParams(params) {
  return { topicId: validateUuid(params.topicId, 'topicId') };
}

export function filterExternalAnswerParams(params) {
  return {
    topicId: validateUuid(params.topicId, 'topicId'),
    answerId: validateUuid(params.answerId, 'answerId'),
  };
}

export function filterUnderstandingParams(params) {
  return {
    topicId: validateUuid(params.topicId, 'topicId'),
    understandingId: validateUuid(params.understandingId, 'understandingId'),
  };
}
