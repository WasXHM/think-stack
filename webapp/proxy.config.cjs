'use strict';

const appConfig = require('./app.config.cjs');

const apiPrefix = `${appConfig.baseHref}api`;
const socketPrefix = `${appConfig.baseHref}socket.io`;
const target = `http://127.0.0.1:${appConfig.webapiPort}`;

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchApiPath(pathname) {
  return matchesPrefix(pathname, apiPrefix);
}

function matchSocketPath(pathname) {
  return matchesPrefix(pathname, socketPrefix);
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const basePath =
  appConfig.baseHref === '/' ? '/' : appConfig.baseHref.slice(0, -1);
const clientRoutePattern =
  appConfig.baseHref === '/'
    ? /^\/.*$/
    : new RegExp(`^${escapeRegularExpression(basePath)}(?:/|$)`);

function rewriteApiPath(pathname) {
  const rest = pathname.slice(apiPrefix.length);
  if (!rest) {
    return '/';
  }
  return rest.startsWith('?') ? `/${rest}` : rest;
}

function rewriteSocketPath(pathname) {
  const rest = pathname.slice(socketPrefix.length);
  return `/socket.io${rest}`;
}

module.exports = {
  apiPrefix,
  clientRoutePattern,
  matchApiPath,
  matchSocketPath,
  rewriteApiPath,
  rewriteSocketPath,
  socketPrefix,
  target,
};

