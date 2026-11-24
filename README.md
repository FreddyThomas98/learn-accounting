# Learn Accounting — First-Year B.Com Financial Accounting Platform

**Learn Accounting** is a full-stack educational web application built for First-Year B.Com undergraduate students learning **Financial Accounting**, starting with **Chapter 1: Journal Entries**.

All academic content is served directly from the authoritative Markdown curriculum stored in `docs/`, preserving every concept, Indian Rupee (`₹`) transaction, worked example, practical exercise, solution, and assessment question without alteration.

---

## Architecture Overview

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Lucide React
- **Backend:** Node.js, Express, TypeScript, Zod, Helmet, Express Rate Limit, bcryptjs
- **Database:** PostgreSQL with Prisma ORM
- **Deployment Target:** Single Render Web Service (serves both the compiled React SPA and the Express API) + Render PostgreSQL

---

## Project Structure

```text
learn-accounting/
├── docs/                                # Authoritative academic Markdown content
│   ├── curriculum/lesson-plan.md
│   ├── content/journal-entries-lesson.md
│   ├── content/practical-exercises.md
│   ├── content/exercise-solutions.md
│   ├── content/final-assessment.md
│   ├── content/answer-key.md
│   └── review/content-quality-report.md
├── prisma/
│   ├── schema.prisma                    # PostgreSQL relational schema
│   ├── migrations/                      # Versioned SQL migrations
│   └── seed.ts                          # Seeds Financial Accounting & Journal Entries
├── server/
│   ├── src/
│   │   ├── config/env.ts                # Environment configuration
│   │   ├── db/prisma.ts                 # Prisma singleton
│   │   ├── middleware/                  # Auth guard & rate limiting
│   │   ├── routes/                      # /health, /api/auth, /api/courses, /api/progress, /api/quiz
│   │   ├── services/                    # Markdown parser, auth/session service, quiz grading engine
│   │   ├── app.ts                       # Express app factory & production SPA hosting
│   │   └── index.ts                     # Server entrypoint (binds 0.0.0.0:PORT)
│   └── tests/                           # Unit & PostgreSQL integration tests (Vitest + Supertest)
├── client/                              # React + TypeScript + Vite + Tailwind frontend
├── docker-compose.yml                   # Optional local PostgreSQL container
├── render.yaml                          # Free-tier Render Blueprint
├── .env.example                         # Environment variable placeholders
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` for local development (never commit `.env` to Git):

| Variable | Required | Description | Render Configuration |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string | Use Render's **Internal (Private) Database URL** when Web Service & DB share the same region |
| `SESSION_SECRET` | Yes | Random secret (≥ 32 chars) used to HMAC-sign session tokens | Auto-generated in Render (`generateValue: true`) or set manually |
| `NODE_ENV` | Yes | `development`, `production`, or `test` | Set to `production` |
| `PORT` | Yes | Port Express listens on (`0.0.0.0`) | Automatically injected by Render (default `4000` locally) |
| `SEED_DEMO_USER` | No | Set `true` **only** in local development to seed a demo student | Keep `"false"` in production |

---

## Local Setup Instructions

### Prerequisites
- Node.js 20+ (`node -v`)
- PostgreSQL 16+ (either local installation or Docker Desktop with `docker-compose.yml`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` with your local `DATABASE_URL` and a random `SESSION_SECRET`.

### 3. Start Local PostgreSQL (Optional via Docker)
```bash
docker compose up -d
```

### 4. Generate Prisma Client, Run Migrations, and Seed Database
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```
*(Optional for local development only: set `SEED_DEMO_USER=true` in `.env` before running `npm run prisma:seed` to create a local demo student account: `student.demo@learnaccounting.local` / `BComStudent@2026`. Never enable this in production.)*

### 5. Run the Application Locally
- **Development mode** (Express API on `http://localhost:4000` + Vite dev server on `http://localhost:5173`):
  ```bash
  npm run dev
  ```
- **Production simulation** (Single Express server serving both API and compiled React bundle):
  ```bash
  npm run build
  npm start
  ```

### 6. Run Automated Tests
Automated tests include content parser verification, backend quiz-scoring tests, and a full end-to-end PostgreSQL + Prisma + Express integration suite (automatically running against an isolated embedded PostgreSQL instance):
```bash
npm test
```

---

## GitHub Connection Instructions

Once you create an empty GitHub repository and are ready to push:

```bash
git status
git add .
git commit -m "Initial commit: Learn Accounting full-stack B.Com platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Render Deployment Instructions (Free Tier)

> **IMPORTANT FREE-TIER DATABASE WARNING:**  
> Render's **Free PostgreSQL** plan **expires after 30 days**, after which the database is suspended and deleted unless upgraded or migrated. Free-tier PostgreSQL storage is **not permanent** and does **not** include automated backups. Export backups regularly (`pg_dump`) before the 30-day window expires.

### Option A: Using `render.yaml` Blueprint (Recommended)
1. Push this repository to GitHub (after approval).
2. In the Render Dashboard, choose **New → Blueprint** and select your GitHub repository.
3. Confirm both `learn-accounting-db` and `learn-accounting` are set to the **Free** plan in the **same region** (e.g., `singapore`).
4. Review environment variables (`DATABASE_URL` automatically links via Render's private/internal connection string; `SESSION_SECRET` auto-generates; `SEED_DEMO_USER` stays `"false"`).
5. Approve and deploy.

### Option B: Manual Render Setup
1. **Create Free PostgreSQL Database** in your preferred region (e.g., Singapore). Copy its **Internal Database URL**.
2. **Create Free Web Service** connected to your GitHub repo in the **same region**:
   - **Runtime:** Node
   - **Build Command:** `npm ci --include=dev && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm run prisma:seed && npm start`
   - **Health Check Path:** `/health`
3. **Set Environment Variables** on the Web Service:
   - `NODE_ENV=production`
   - `DATABASE_URL=<Render Internal Database URL>`
   - `SESSION_SECRET=<random 64-char hex string>`
   - `SEED_DEMO_USER=false`
4. Verify deployment by checking `GET https://<your-service>.onrender.com/health` returns `{"status":"ok","database":"connected"}`.
