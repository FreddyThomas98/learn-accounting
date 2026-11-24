import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT_DIR = process.cwd();
const PG_DIR = path.join(ROOT_DIR, '.pg-dev-data');
const PG_PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const APP_PORT = Number(process.env.PORT || 4000);
const DB_NAME = 'learn_accounting';
const DATABASE_URL = `postgresql://postgres:local_dev_password@127.0.0.1:${PG_PORT}/${DB_NAME}?schema=public`;

async function main() {
  const isFirstInit = !fs.existsSync(path.join(PG_DIR, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: PG_DIR,
    user: 'postgres',
    password: 'local_dev_password',
    port: PG_PORT,
    persistent: true,
  });

  if (isFirstInit) {
    console.log('[Local DB] Initializing local PostgreSQL cluster in .pg-dev-data ...');
    await pg.initialise();
  }

  console.log(`[Local DB] Starting PostgreSQL on 127.0.0.1:${PG_PORT} ...`);
  await pg.start();

  if (isFirstInit) {
    await pg.createDatabase(DB_NAME);
  }

  const env = {
    ...process.env,
    DATABASE_URL,
    NODE_ENV: 'development',
    PORT: String(APP_PORT),
    SESSION_SECRET:
      process.env.SESSION_SECRET ||
      'local-development-session-secret-at-least-32-characters',
    SEED_DEMO_USER: 'true',
  };

  console.log('[Local DB] Applying Prisma migrations ...');
  execSync('npx prisma migrate deploy', { cwd: ROOT_DIR, env, stdio: 'inherit' });

  console.log('[Local DB] Seeding Financial Accounting course, Chapter 1 & local dev demo student ...');
  execSync('npm run prisma:seed', { cwd: ROOT_DIR, env, stdio: 'inherit' });

  console.log(`[App] Starting Learn Accounting on http://localhost:${APP_PORT} ...`);
  const serverProc = spawn(process.execPath, ['dist/server/index.js'], {
    cwd: ROOT_DIR,
    env,
    stdio: 'inherit',
  });

  const cleanup = async () => {
    console.log('\n[Local] Shutting down server and PostgreSQL...');
    serverProc.kill();
    await pg.stop().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  serverProc.on('exit', async (code) => {
    await pg.stop().catch(() => {});
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('[Local] Startup failed:', err);
  process.exit(1);
});
