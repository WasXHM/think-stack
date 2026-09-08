export async function getHealthStatus({ verbose = false, topicStore } = {}) {
  const storage = await topicStore.inspect();
  const health = {
    status: 'ok',
    storage: storage.status,
    timestamp: new Date().toISOString(),
  };

  if (verbose) {
    health.uptimeSeconds = Math.round(process.uptime());
    health.nodeVersion = process.version;
    health.storageDriver = storage.driver;
    health.topicCount = storage.topicCount;
  }

  return health;
}
