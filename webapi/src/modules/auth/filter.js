import { ValidationError } from '../../core/errors.js';
export function filterLogin(body) {
  if (typeof body?.username !== 'string' || typeof body?.password !== 'string' || !body.username.trim() || !body.password || body.username.length > 100 || body.password.length > 256) {
    throw new ValidationError('请输入有效的用户名和密码。');
  }
  return { username: body.username.trim(), password: body.password };
}
