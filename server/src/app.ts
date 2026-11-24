import fs from 'fs';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import coursesRouter from './routes/courses';
import progressRouter from './routes/progress';
import quizRouter from './routes/quiz';

export function createApp() {
  const app = express();

  // Required behind Render's TLS reverse proxy so Secure cookies & IP rate limiting work accurately
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  if (!env.isProduction) {
    app.use(
      cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      })
    );
  }

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  // Public health check for Render and uptime monitors
  app.use('/health', healthRouter);

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api', coursesRouter);
  app.use('/api/progress', progressRouter);
  app.use('/api/quiz', quizRouter);

  // Unknown API routes return clean JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Serve compiled React SPA in production (single Render Web Service architecture)
  const clientDistCandidates = [
    path.resolve(process.cwd(), 'dist/client'),
    path.resolve(__dirname, '../client'),
    path.resolve(__dirname, '../../dist/client'),
  ];
  const clientDistDir = clientDistCandidates.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html'))
  );

  if (clientDistDir) {
    app.use(express.static(clientDistDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  // Global error handler (never leaks stack traces or secrets in production)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (!env.isTest) {
      console.error('[Server Error]', err.message);
    }
    res.status(500).json({
      error: env.isProduction
        ? 'An unexpected server error occurred. Please try again.'
        : err.message || 'Internal server error',
    });
  });

  return app;
}
