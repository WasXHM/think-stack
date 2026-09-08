import { apiPrefix } from '../config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', details, payload } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
}

function apiUrl(path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${apiPrefix}${suffix}`;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest(path, options = {}) {
  const { body, headers: providedHeaders, ...requestOptions } = options;
  const headers = new Headers(providedHeaders);
  let requestBody = body;

  if (
    body != null &&
    typeof body !== 'string' &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
  ) {
    requestBody = JSON.stringify(body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...requestOptions,
      body: requestBody,
      headers,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('暂时无法连接到服务，请检查服务状态后重试。', {
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const serverError = payload?.error;
    throw new ApiError(
      serverError?.message ?? `请求未完成（HTTP ${response.status}）。`,
      {
        status: response.status,
        code: serverError?.code,
        details: serverError?.details,
        payload,
      },
    );
  }

  return payload;
}

