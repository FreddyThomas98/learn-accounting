import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import request from 'supertest';
import EmbeddedPostgres from 'embedded-postgres';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const TEST_PG_PORT = 55432;
const TEST_PG_DIR = path.resolve(process.cwd(), '.pg-test-data');
const TEST_DB_URL = `postgresql://postgres:test_password@127.0.0.1:${TEST_PG_PORT}/learn_accounting_test?schema=public`;

let pg: EmbeddedPostgres | null = null;
let app: ReturnType<typeof import('../src/app').createApp>;
let prismaClient: typeof import('../src/db/prisma').prisma;

describe('Learn Accounting Full-Stack API & PostgreSQL Integration Tests', () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_PG_DIR)) {
      fs.rmSync(TEST_PG_DIR, { recursive: true, force: true });
    }

    pg = new EmbeddedPostgres({
      databaseDir: TEST_PG_DIR,
      user: 'postgres',
      password: 'test_password',
      port: TEST_PG_PORT,
      persistent: false,
    });

    await pg.initialise();
    await pg.start();
    await pg.createDatabase('learn_accounting_test');

    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'integration-test-secret-minimum-32-chars-long';

    // Apply real Prisma SQL migrations against PostgreSQL
    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    const [{ createApp }, { prisma }, { seedDatabase }] = await Promise.all([
      import('../src/app'),
      import('../src/db/prisma'),
      import('../../prisma/seed'),
    ]);

    prismaClient = prisma;
    await seedDatabase(prismaClient);
    app = createApp();
  }, 120000);

  afterAll(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
    if (pg) {
      await pg.stop();
    }
    if (fs.existsSync(TEST_PG_DIR)) {
      fs.rmSync(TEST_PG_DIR, { recursive: true, force: true });
    }
  }, 60000);

  it('GET /health verifies PostgreSQL connectivity', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('blocks unauthenticated access to protected endpoints with 401', async () => {
    const endpoints = [
      '/api/auth/me',
      '/api/courses',
      '/api/progress/dashboard',
      '/api/chapters/journal-entries/lesson',
      '/api/chapters/journal-entries/exercises',
      '/api/chapters/journal-entries/quiz',
      '/api/quiz/attempts',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(401);
    }
  });

  it('supports registration, password hashing, duplicate email blocking, HttpOnly session cookie, logout, and login', async () => {
    const agent = request.agent(app);

    // 1. Register new student
    const regRes = await agent.post('/api/auth/register').send({
      name: 'Rohan Kulkarni',
      email: 'Rohan.Kulkarni@BCom.edu',
      password: 'SecurePassword@2026',
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.email).toBe('rohan.kulkarni@bcom.edu');
    expect(regRes.body.user.passwordHash).toBeUndefined();
    expect(regRes.body.user.password).toBeUndefined();

    // Verify HttpOnly cookie was issued
    const setCookie = regRes.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.includes('learn_accounting_sid=') && c.includes('HttpOnly'))).toBe(true);

    // Verify password is hashed in PostgreSQL (never plain text)
    const dbUser = await prismaClient.user.findUnique({
      where: { email: 'rohan.kulkarni@bcom.edu' },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe('SecurePassword@2026');
    expect(dbUser!.passwordHash.startsWith('$2')).toBe(true);

    // 2. Prevent duplicate email registration
    const dupRes = await request(app).post('/api/auth/register').send({
      name: 'Duplicate User',
      email: 'rohan.kulkarni@bcom.edu',
      password: 'AnotherPassword@2026',
    });
    expect(dupRes.status).toBe(409);

    // 3. Authenticated /api/auth/me works
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.name).toBe('Rohan Kulkarni');

    // 4. Logout revokes session
    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);

    // 5. Login fails with wrong password
    const badLogin = await agent.post('/api/auth/login').send({
      email: 'rohan.kulkarni@bcom.edu',
      password: 'WrongPassword123',
    });
    expect(badLogin.status).toBe(401);

    // 6. Login succeeds with valid password
    const goodLogin = await agent.post('/api/auth/login').send({
      email: 'rohan.kulkarni@bcom.edu',
      password: 'SecurePassword@2026',
    });
    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.user.email).toBe('rohan.kulkarni@bcom.edu');
  });

  it('tracks lesson progress, reveals exercise solutions on demand, grades quiz on backend without leaking answers, and saves history', async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post('/api/auth/login').send({
      email: 'rohan.kulkarni@bcom.edu',
      password: 'SecurePassword@2026',
    });
    expect(loginRes.status).toBe(200);

    // Lesson content + progress saving
    const lessonRes = await agent.get('/api/chapters/journal-entries/lesson');
    expect(lessonRes.status).toBe(200);
    expect(lessonRes.body.lesson.sections).toHaveLength(14);

    const progLesson = await agent.post('/api/progress/lesson').send({
      chapterSlug: 'journal-entries',
      sectionId: 'section-1',
      completed: true,
    });
    expect(progLesson.status).toBe(200);
    expect(progLesson.body.progress.completed).toBe(true);
    expect(progLesson.body.progress.completedSections).toContain('section-1');

    // Exercises list + separate solution reveal + progress saving
    const exRes = await agent.get('/api/chapters/journal-entries/exercises');
    expect(exRes.status).toBe(200);
    expect(exRes.body.exercises).toHaveLength(5);

    const solRes = await agent.get('/api/chapters/journal-entries/exercises/ex-5/solution');
    expect(solRes.status).toBe(200);
    expect(solRes.body.solution.markdown).toContain('Depreciation A/c');
    expect(solRes.body.solution.markdown).toContain('Drawings A/c');
    expect(solRes.body.verificationMarkdown).toContain('2,30,000');

    const exProg = await agent.post('/api/progress/exercise').send({
      chapterSlug: 'journal-entries',
      exerciseId: 'ex-1',
      completed: true,
    });
    expect(exProg.status).toBe(200);
    expect(exProg.body.exerciseProgress.completed).toBe(true);

    // Quiz load MUST NOT leak correct answers or explanations before submission
    const quizRes = await agent.get('/api/chapters/journal-entries/quiz');
    expect(quizRes.status).toBe(200);
    expect(quizRes.body.questions).toHaveLength(10);
    const rawQuizJson = JSON.stringify(quizRes.body);
    expect(rawQuizJson).not.toContain('correctOption');
    expect(rawQuizJson).not.toContain('explanation');

    // Submit 8/10 correct answers (and send a forged score: 10 that the backend must ignore!)
    const submitRes = await agent.post('/api/quiz/submit').send({
      chapterSlug: 'journal-entries',
      score: 10,
      answers: {
        'q-1': 'B', // correct
        'q-2': 'C', // correct
        'q-3': 'D', // correct
        'q-4': 'A', // correct
        'q-5': 'B', // correct
        'q-6': 'C', // correct
        'q-7': 'A', // correct
        'q-8': 'C', // correct
        'q-9': 'A', // wrong (correct is D)
        'q-10': 'A', // wrong (correct is B)
      },
    });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.score).toBe(8);
    expect(submitRes.body.totalQuestions).toBe(10);
    expect(submitRes.body.percentage).toBe(80);
    expect(submitRes.body.passed).toBe(true);
    expect(submitRes.body.mastery).toBe(true);
    expect(submitRes.body.results).toHaveLength(10);
    expect(submitRes.body.results[8].correctOption).toBe('D');
    expect(submitRes.body.results[8].explanation).toContain('11,000');

    const attemptId = submitRes.body.attemptId as string;

    // Quiz history + detailed review from PostgreSQL
    const historyRes = await agent.get('/api/quiz/attempts');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.attempts).toHaveLength(1);
    expect(historyRes.body.attempts[0].score).toBe(8);

    const detailRes = await agent.get(`/api/quiz/attempts/${attemptId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.results).toHaveLength(10);

    // Dashboard reflects persisted PostgreSQL progress
    const dashRes = await agent.get('/api/progress/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.summary.lessonCompleted).toBe(true);
    expect(dashRes.body.summary.completedExercisesCount).toBe(1);
    expect(dashRes.body.summary.quizAttemptsCount).toBe(1);
    expect(dashRes.body.summary.bestQuizPercentage).toBe(80);
  });
});
