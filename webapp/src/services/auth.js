import { apiRequest } from './http.js';
export const getSession = () => apiRequest('/auth/session', { cache: 'no-store' }).then((result) => result.data);
export const login = (values) => apiRequest('/auth/login', { method: 'POST', body: values }).then((result) => result.data);
export const logout = () => apiRequest('/auth/logout', { method: 'POST' });
