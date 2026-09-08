import { apiRequest } from './http.js';

function unwrapData(payload) {
  return payload?.data ?? payload;
}

export async function listTopics({ query = '', signal } = {}) {
  const search = new URLSearchParams();
  if (query.trim()) {
    search.set('q', query.trim());
  }
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return unwrapData(await apiRequest(`/topics${suffix}`, { signal }));
}

export async function getTopic(topicId, { signal } = {}) {
  return unwrapData(await apiRequest(`/topics/${encodeURIComponent(topicId)}`, { signal }));
}

export async function createTopic(input, { signal } = {}) {
  return unwrapData(
    await apiRequest('/topics', {
      method: 'POST',
      body: input,
      signal,
    }),
  );
}

export async function updateTopic(topicId, input, { signal } = {}) {
  return unwrapData(
    await apiRequest(`/topics/${encodeURIComponent(topicId)}`, {
      method: 'PATCH',
      body: input,
      signal,
    }),
  );
}

export async function deleteTopic(topicId) {
  return apiRequest(`/topics/${encodeURIComponent(topicId)}`, {
    method: 'DELETE',
  });
}

export async function createExternalAnswer(topicId, input) {
  return unwrapData(
    await apiRequest(`/topics/${encodeURIComponent(topicId)}/external-answers`, {
      method: 'POST',
      body: input,
    }),
  );
}

export async function updateExternalAnswer(topicId, answerId, input) {
  return unwrapData(
    await apiRequest(
      `/topics/${encodeURIComponent(topicId)}/external-answers/${encodeURIComponent(answerId)}`,
      {
        method: 'PATCH',
        body: input,
      },
    ),
  );
}

export async function deleteExternalAnswer(topicId, answerId) {
  return apiRequest(
    `/topics/${encodeURIComponent(topicId)}/external-answers/${encodeURIComponent(answerId)}`,
    { method: 'DELETE' },
  );
}

export async function createUnderstanding(topicId, input) {
  return unwrapData(
    await apiRequest(`/topics/${encodeURIComponent(topicId)}/understandings`, {
      method: 'POST',
      body: input,
    }),
  );
}

export async function updateUnderstanding(topicId, understandingId, input) {
  return unwrapData(
    await apiRequest(
      `/topics/${encodeURIComponent(topicId)}/understandings/${encodeURIComponent(understandingId)}`,
      {
        method: 'PATCH',
        body: input,
      },
    ),
  );
}

export async function deleteUnderstanding(topicId, understandingId) {
  return apiRequest(
    `/topics/${encodeURIComponent(topicId)}/understandings/${encodeURIComponent(understandingId)}`,
    { method: 'DELETE' },
  );
}

