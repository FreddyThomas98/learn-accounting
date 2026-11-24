import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { getAttemptDetailsForUser, recordQuizAttempt } from '../services/quizService';

const router = Router();

router.use(requireAuth);

const submitQuizSchema = z.object({
  chapterSlug: z.string().min(1),
  answers: z.record(z.string(), z.enum(['A', 'B', 'C', 'D'])),
});

router.post('/submit', async (req, res, next) => {
  try {
    const parsed = submitQuizSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Please answer all 10 questions by selecting option A, B, C, or D.',
      });
      return;
    }

    const chapter = await prisma.chapter.findUnique({
      where: { slug: parsed.data.chapterSlug },
    });

    if (!chapter || chapter.slug !== 'journal-entries') {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    try {
      const graded = await recordQuizAttempt(req.user!.id, chapter.id, parsed.data.answers);
      res.status(201).json(graded);
    } catch (gradingErr) {
      res.status(400).json({
        error: gradingErr instanceof Error ? gradingErr.message : 'Unable to grade submission.',
      });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/attempts', async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: req.user!.id },
      orderBy: { attemptedAt: 'desc' },
      include: {
        chapter: {
          select: { slug: true, title: true },
        },
      },
    });

    res.status(200).json({
      attempts: attempts.map((a) => ({
        id: a.id,
        chapterSlug: a.chapter.slug,
        chapterTitle: a.chapter.title,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: a.percentage,
        passed: a.percentage >= 60,
        mastery: a.percentage >= 80,
        attemptedAt: a.attemptedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/attempts/:attemptId', async (req, res, next) => {
  try {
    const details = await getAttemptDetailsForUser(req.user!.id, req.params.attemptId);
    if (!details) {
      res.status(404).json({ error: 'Quiz attempt not found.' });
      return;
    }

    res.status(200).json(details);
  } catch (err) {
    next(err);
  }
});

export default router;
