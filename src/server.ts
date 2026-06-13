import type { Server } from 'node:http';
import app from './app.js';
import { config } from './core/config/env.js';

let server: Server | undefined;

function shutdown(signal: NodeJS.Signals): void {
  console.info(`${signal} received, shutting down HTTP server`);

  if (!server) {
    process.exit(0);
  }

  server.close((error) => {
    if (error) {
      console.error('Failed to close HTTP server', error);
      process.exit(1);
    }

    process.exit(0);
  });
}

server = app.listen(config.port, config.host, () => {
  console.info(`TTK API listening on http://localhost:${config.port}`);
  console.info(`Swagger UI available on http://localhost:${config.port}/docs`);
});

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
