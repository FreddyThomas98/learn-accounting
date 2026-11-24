import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './db/prisma';

const app = createApp();

const server = app.listen(env.port, env.host, () => {
  console.log(
    `Learn Accounting server listening on http://${env.host}:${env.port} (${env.nodeEnv})`
  );
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server and database connections...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
