'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const appConfig = require('../app.config.cjs');
const proxy = require('../proxy.config.cjs');

test('baseHref is normalized and drives public paths', () => {
  assert.equal(appConfig.baseHref, '/think-stack/');
  assert.equal(proxy.apiPrefix, '/think-stack/api');
  assert.equal(proxy.socketPrefix, '/think-stack/socket.io');
  assert.equal(proxy.target, 'http://127.0.0.1:3001');
});

test('API matching observes segment boundaries and preserves the remaining path', () => {
  assert.equal(proxy.matchApiPath('/think-stack/api'), true);
  assert.equal(proxy.matchApiPath('/think-stack/api/topics'), true);
  assert.equal(proxy.matchApiPath('/think-stack/apiary'), false);
  assert.equal(proxy.rewriteApiPath('/think-stack/api'), '/');
  assert.equal(proxy.rewriteApiPath('/think-stack/api?query=mcp'), '/?query=mcp');
  assert.equal(proxy.rewriteApiPath('/think-stack/api/topics?q=mcp'), '/topics?q=mcp');
});

test('Socket.IO matching and client fallback remain isolated', () => {
  assert.equal(proxy.matchSocketPath('/think-stack/socket.io'), true);
  assert.equal(proxy.matchSocketPath('/think-stack/socket.io/'), true);
  assert.equal(proxy.matchSocketPath('/think-stack/socket.ioevil'), false);
  assert.equal(
    proxy.rewriteSocketPath('/think-stack/socket.io/?EIO=4&transport=websocket'),
    '/socket.io/?EIO=4&transport=websocket',
  );
  assert.equal(proxy.clientRoutePattern.test('/think-stack/topics/example'), true);
  assert.equal(proxy.clientRoutePattern.test('/think-stack-other/example'), false);
  assert.equal(proxy.clientRoutePattern.test('/outside-client-route'), false);
});
