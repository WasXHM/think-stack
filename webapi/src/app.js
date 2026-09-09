import 'dotenv/config';

import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';
import { createTopicService } from './modules/topics/service.js';
import router from './routers.js';
import { createImageService } from './modules/images/service.js';
import { createSocketServer } from './sockets/index.js';
import { FileTopicStore } from './storage/topic-store.js';

const DEFAULT_RESOURCES_DIRECTORY = fileURLToPath(new URL('../resources/', import.meta.url));
const WEBAPI_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new TypeError(`Invalid port: ${value}`);
  }
  return port;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function closeSocketServer(io, timeoutMs) {
  return new Promise((resolveClose) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolveClose();
      }
    };
    const timer = setTimeout(finish, timeoutMs);
    io.close(finish);
  });
}

function closeHttpServer(server, timeoutMs) {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolveClose, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolveClose();
      }
    };
    const timer = setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, timeoutMs);
    server.close(finish);
    server.closeIdleConnections?.();
  });
}

export function createApplication({
  resourcesDir,
  env = process.env,
  logger = console,
  topicStore,
} = {}) {
  const resolvedResourcesDirectory = resourcesDir
    ?? (env.RESOURCES_DIR
      ? resolve(WEBAPI_DIRECTORY, env.RESOURCES_DIR)
      : DEFAULT_RESOURCES_DIRECTORY);
  const store = topicStore ?? new FileTopicStore({ resourcesDir: resolvedResourcesDirectory });
  const app = new Koa();

  app.proxy = env.TRUST_PROXY === 'true';
  app.context.imageService = createImageService(resolvedResourcesDirectory);
  app.context.topicStore = store;
  app.context.topicService = createTopicService(store);
  app.use(errorHandler);
  app.use(async (ctx, next) => {
    if (ctx.method === 'POST' && /^\/images\/?$/.test(ctx.path)) ctx.disableBodyParser = true;
    await next();
  });
  app.use(bodyParser({
    enableTypes: ['json'],
    jsonLimit: env.BODY_LIMIT ?? '1mb',
  }));
  app.use(router.routes());
  app.use(router.allowedMethods({ throw: true }));
  app.use(notFound);

  app.on('error', (error, ctx) => {
    logger.error?.('Web API request failed', {
      error,
      method: ctx?.method,
      path: ctx?.path,
    });
  });

  const server = createServer(app.callback());
  const io = createSocketServer(server);
  const shutdownTimeoutMs = parsePositiveInteger(env.SHUTDOWN_TIMEOUT_MS, 5_000);
  let stopping;

  async function start({
    host = env.HOST ?? '127.0.0.1',
    port = env.PORT ?? 3001,
  } = {}) {
    if (server.listening) {
      return server;
    }

    if (stopping) {
      throw new Error('Cannot start an application that is stopping or stopped');
    }

    await store.initialize();
    const normalizedPort = parsePort(port);

    await new Promise((resolveStart, reject) => {
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolveStart();
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(normalizedPort, host);
    });

    const address = server.address();
    const boundHost = typeof address === 'object' && address ? address.address : host;
    const boundPort = typeof address === 'object' && address ? address.port : normalizedPort;
    logger.log?.(`ThinkStack Web API listening on http://${boundHost}:${boundPort}`);
    return server;
  }

  function stop(signal = 'shutdown') {
    if (stopping) {
      return stopping;
    }

    stopping = (async () => {
      logger.log?.(`Received ${signal}; shutting down ThinkStack Web API.`);
      try {
        await closeSocketServer(io, shutdownTimeoutMs);
      } finally {
        await closeHttpServer(server, shutdownTimeoutMs);
      }
    })();

    return stopping;
  }

  return {
    app,
    io,
    resourcesDir: resolvedResourcesDirectory,
    server,
    start,
    stop,
    topicStore: store,
  };
}

const runtime = createApplication();

export const { app, io, server, start, stop, topicStore } = runtime;

const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  start().catch(async (error) => {
    console.error('Failed to start ThinkStack Web API.', error);
    await stop('startup failure').catch(() => {});
    process.exitCode = 1;
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      stop(signal)
        .then(() => {
          process.exitCode = 0;
        })
        .catch((error) => {
          console.error('Graceful shutdown failed.', error);
          process.exitCode = 1;
        });
    });
  }
}
