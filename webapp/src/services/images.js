import { apiPrefix } from '../config.js';
import { apiRequest } from './http.js';

export async function uploadImage(file, { signal } = {}) {
  const { data } = await apiRequest('/images', {
    method: 'POST',
    headers: { 'content-type': file.type },
    body: file,
    signal,
  });
  return `${apiPrefix}${data.path}`;
}
