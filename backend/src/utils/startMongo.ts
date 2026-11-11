import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

async function run() {
  const dbPath = path.resolve(__dirname, '../../mongo-data');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  const server = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });

  console.log(`[MongoDB Dev Server] Running at ${server.getUri()}`);
  console.log(`[MongoDB Dev Server] Data directory: ${dbPath}`);

  // Keep event loop alive
  setInterval(() => {}, 1000 * 60 * 60);

  const shutdown = async () => {
    console.log('[MongoDB Dev Server] Stopping...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

run().catch((err) => {
  console.error('[MongoDB Dev Server Error]:', err);
  process.exit(1);
});
