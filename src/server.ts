import type { Server } from 'node:http';
import app from './app.js';
import { closeDatabase } from './core/config/database.js';
import { config } from './core/config/env.js';
import { closeRedis } from './core/config/redis.js';
import { logger } from './core/utils/logger.js';

let server: Server | undefined;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('shutdown_signal_received', { signal });

  if (!server) {
    process.exit(0);
  }

  server.close(async (error) => {
    if (error) {
      logger.error('http_server_close_failed', { error });
      process.exit(1);
    }

    await closeDatabase();
    closeRedis();
    process.exit(0);
  });
}

server = app.listen(config.port, config.host, () => {
  logger.info('http_server_started', {
    url: `http://localhost:${config.port}`,
    swaggerUrl: `http://localhost:${config.port}/api-docs`
  });
});

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
