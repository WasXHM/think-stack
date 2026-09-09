// Webpack injects these identifiers in the legacy build; Next resolves the
// same values from its App Router basePath and uses these safe fallbacks.
const configuredAppName = typeof APP_DISPLAY_NAME !== 'undefined' ? APP_DISPLAY_NAME : 'ThinkStack / 思栈';
const configuredBaseHref = typeof APP_BASE_HREF !== 'undefined' ? APP_BASE_HREF : '/think-stack/';

export const appName = configuredAppName;
export const baseHref = configuredBaseHref;
export const routerBaseHref = baseHref === '/' ? '/' : baseHref.slice(0, -1);
export const apiPrefix = `${baseHref}api`;
export const socketPath = `${baseHref}socket.io`;
