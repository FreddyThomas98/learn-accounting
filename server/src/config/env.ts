import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const sessionSecret =
  process.env.SESSION_SECRET ||
  (isProduction ? '' : 'dev-only-insecure-session-secret-change-in-production');

if (isProduction && sessionSecret.length < 32) {
  throw new Error(
    'SESSION_SECRET must be set to a random string of at least 32 characters in production.'
  );
}

export const env = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret,
};
