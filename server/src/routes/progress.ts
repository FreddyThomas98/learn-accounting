import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { getExercises, getLessonContent } from '../services/markdownContent';

const router = Router();

router.use(requireAuth);

const lessonProgressSchema = z.object({
  chapterSlug: z.string().min(1),
  sectionId: z.string().optional(),
  completed: z.boolean().optional(),
});

const exerciseProgressSchema = z.object({
  chapterSlug: z.string().min(1),
  exerciseId: z.enum(['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5']),
  completed: z.boolean(),
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const chapter = await prisma.chapter.findUnique({
      where: { slug: 'journal-entries' },
      include: { course: true },
    });

    if (!chapter) {
      res.status(404).json({ error: 'Initial course data has not been seeded yet.' });
      return;
    }

    const [lessonProgress, exerciseProgress, quizAttempts] = await Promise.all([
      prisma.lessonProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: chapter.id } },
      }),
      prisma.exerciseProgress.findMany({
        where: { userId, chapterId: chapter.id, completed: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, chapterId: chapter.id },
        orderBy: { attemptedAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalSections = getLessonContent().sections.length;
    const totalExercises = getExercises().exercises.length;
    const completedSectionsCount = lessonProgress?.completedSections.length ?? 0;
    const lessonCompleted = lessonProgress?.completed ?? false;
    const completedExercisesCount = exerciseProgress.length;
    const bestQuiz =
      quizAttempts.length > 0
        ? quizAttempts.reduce((best, item) => (item.percentage > best.percentage ? item : best), quizAttempts[0])
        : null;
    const quizPassed = bestQuiz ? bestQuiz.percentage >= 60 : false;

    // Overall progress weighting: 40% Lesson (sections/completion) + 35% Exercises + 25% Passing Quiz
    const lessonScore = lessonCompleted
      ? 40
      : Math.round((completedSectionsCount / Math.max(totalSections, 1)) * 35);
    const exerciseScore = Math.round((completedExercisesCount / Math.max(totalExercises, 1)) * 35);
    const quizScore = quizPassed ? 25 : quizAttempts.length > 0 ? 10 : 0;
    const overallPercentage = Math.min(100, lessonScore + exerciseScore + quizScore);

    res.status(200).json({
      course: {
        id: chapter.course.id,
        slug: chapter.course.slug,
        title: chapter.course.title,
        description: chapter.course.description,
        level: chapter.course.level,
      },
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        description: chapter.description,
      },
      summary: {
        overallPercentage,
        lessonCompleted,
        completedSectionsCount,
        totalSections,
        completedExercisesCount,
        totalExercises,
        quizAttemptsCount: quizAttempts.length,
        bestQuizScore: bestQuiz?.score ?? null,
        bestQuizPercentage: bestQuiz?.percentage ?? null,
        quizPassed,
      },
      recentAttempts: quizAttempts.slice(0, 5).map((a) => ({
        id: a.id,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: a.percentage,
        attemptedAt: a.attemptedAt,
        passed: a.percentage >= 60,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/lesson', async (req, res, next) => {
  try {
    const parsed = lessonProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid progress payload.' });
      return;
    }

    const chapter = await prisma.chapter.findUnique({
      where: { slug: parsed.data.chapterSlug },
    });

    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    const validSectionIds = new Set(getLessonContent().sections.map((s) => s.id));
    if (parsed.data.sectionId && !validSectionIds.has(parsed.data.sectionId)) {
      res.status(400).json({ error: 'Invalid lesson section identifier.' });
      return;
    }

    const existing = await prisma.lessonProgress.findUnique({
      where: {
        userId_chapterId: {
          userId: req.user!.id,
          chapterId: chapter.id,
        },
      },
    });

    const nextSections = new Set(existing?.completedSections ?? []);
    if (parsed.data.sectionId) {
      nextSections.add(parsed.data.sectionId);
    }

    const nextCompleted =
      parsed.data.completed !== undefined ? parsed.data.completed : (existing?.completed ?? false);

    const updated = await prisma.lessonProgress.upsert({
      where: {
        userId_chapterId: {
          userId: req.user!.id,
          chapterId: chapter.id,
        },
      },
      update: {
        completedSections: Array.from(nextSections),
        completed: nextCompleted,
        completedAt: nextCompleted ? (existing?.completedAt ?? new Date()) : null,
      },
      create: {
        userId: req.user!.id,
        chapterId: chapter.id,
        completedSections: Array.from(nextSections),
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      },
    });

    res.status(200).json({
      progress: {
        completed: updated.completed,
        completedSections: updated.completedSections,
        completedAt: updated.completedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/exercise', async (req, res, next) => {
  try {
    const parsed = exerciseProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid exercise progress payload.' });
      return;
    }

    const chapter = await prisma.chapter.findUnique({
      where: { slug: parsed.data.chapterSlug },
    });

    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    const updated = await prisma.exerciseProgress.upsert({
      where: {
        userId_chapterId_exerciseId: {
          userId: req.user!.id,
          chapterId: chapter.id,
          exerciseId: parsed.data.exerciseId,
        },
      },
      update: {
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? new Date() : null,
      },
      create: {
        userId: req.user!.id,
        chapterId: chapter.id,
        exerciseId: parsed.data.exerciseId,
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? new Date() : null,
      },
    });

    res.status(200).json({
      exerciseProgress: {
        exerciseId: updated.exerciseId,
        completed: updated.completed,
        completedAt: updated.completedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
