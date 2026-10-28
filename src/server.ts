import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './database/prisma';

const app = createApp();

// 0.0.0.0 so the cloud (Render) can reach the server; PORT is provided by the cloud.
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[server] TaskFlow Pro API running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[server] Swagger UI:   http://localhost:${env.PORT}/api-docs`);
  console.log(`[server] Health check: http://localhost:${env.PORT}/api/health`);
});

async function shutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
