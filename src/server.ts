import type { Server } from 'node:http';
import app from './app.js';
import { closeDatabase } from './core/config/database.js';
import { config } from './core/config/env.js';
import { closeRedis } from './core/config/redis.js';
import { warmGoogleAuth } from './modules/auth/google.service.js';

let server: Server | undefined;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.info(`${signal} received, shutting down HTTP server`);

  if (!server) {
    process.exit(0);
  }

  server.close(async (error) => {
    if (error) {
      console.error('Failed to close HTTP server', error);
      process.exit(1);
    }

    await closeDatabase();
    closeRedis();
    process.exit(0);
  });
}

server = app.listen(config.port, config.host, () => {
  console.info(`TTK API listening on http://localhost:${config.port}`);
  console.info(
    `Swagger UI available on http://localhost:${config.port}/api-docs`
  );
  void warmGoogleAuth()
    .then(() => console.info('Google signing certificates cached'))
    .catch(() => console.warn('Google certificate prefetch failed'));
});

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
