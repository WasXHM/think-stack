export const appName = APP_DISPLAY_NAME;
export const baseHref = APP_BASE_HREF;
export const routerBaseHref = baseHref === '/' ? '/' : baseHref.slice(0, -1);
export const apiPrefix = `${baseHref}api`;
export const socketPath = `${baseHref}socket.io`;

