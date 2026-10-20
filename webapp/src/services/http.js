import { t, getLanguage, startWrite } from '../i18n/index.js';
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

async function performApiRequest(path, options = {}) {
  const { body, headers: providedHeaders, ...requestOptions } = options;
  const headers = new Headers(providedHeaders);
  const language = getLanguage();
  headers.set('x-thinkstack-language', language);
  if (!['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase())) headers.set('x-thinkstack-request', '1');
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
    response = await fetch(`${apiUrl(path)}${path.includes('?') ? '&' : '?'}lang=${language}`, {
      cache: 'no-store',
      ...requestOptions,
      body: requestBody,
      headers,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(t("暂时无法连接到服务，请检查服务状态后重试。"), {
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && typeof window !== 'undefined') window.dispatchEvent(new Event('thinkstack:unauthorized'));
    const serverError = payload?.error;
    throw new ApiError(
      t(serverError?.message ?? '', {}, language) || t("请求未完成（HTTP {p0}）。", {
  p0: response.status
}),
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


export async function apiRequest(path, options = {}) {
  const finish = ['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase()) ? () => {} : startWrite();
  try { return await performApiRequest(path, options); }
  finally { finish(); }
}
