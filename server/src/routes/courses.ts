import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import {
  getExercises,
  getExerciseSolutions,
  getLessonContent,
  getPublicQuizQuestions,
} from '../services/markdownContent';

const router = Router();

router.use(requireAuth);

router.get('/courses', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        chapters: {
          orderBy: { displayOrder: 'asc' },
          include: {
            lessonProgress: {
              where: { userId },
              take: 1,
            },
            exerciseProgress: {
              where: { userId, completed: true },
            },
            quizAttempts: {
              where: { userId },
              orderBy: { attemptedAt: 'desc' },
            },
          },
        },
      },
    });

    const lesson = getLessonContent();
    const { exercises } = getExercises();
    const questions = getPublicQuizQuestions();

    const formatted = courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      level: course.level,
      createdAt: course.createdAt,
      chapters: course.chapters.map((ch) => {
        const lp = ch.lessonProgress[0];
        const bestQuiz = ch.quizAttempts.reduce(
          (max, a) => (a.percentage > max ? a.percentage : max),
          0
        );

        return {
          id: ch.id,
          slug: ch.slug,
          title: ch.title,
          description: ch.description,
          displayOrder: ch.displayOrder,
          stats: {
            totalSections: lesson.sections.length,
            completedSectionsCount: lp?.completedSections.length ?? 0,
            lessonCompleted: lp?.completed ?? false,
            totalExercises: exercises.length,
            completedExercisesCount: ch.exerciseProgress.length,
            totalQuizQuestions: questions.length,
            quizAttemptsCount: ch.quizAttempts.length,
            bestQuizPercentage: ch.quizAttempts.length > 0 ? bestQuiz : null,
          },
        };
      }),
    }));

    res.status(200).json({ courses: formatted });
  } catch (err) {
    next(err);
  }
});

router.get('/chapters/:slug/lesson', async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { slug: req.params.slug },
      include: { course: true },
    });

    if (!chapter || chapter.slug !== 'journal-entries') {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_chapterId: {
          userId: req.user!.id,
          chapterId: chapter.id,
        },
      },
    });

    const lessonContent = getLessonContent();

    res.status(200).json({
      course: {
        id: chapter.course.id,
        slug: chapter.course.slug,
        title: chapter.course.title,
        level: chapter.course.level,
      },
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        description: chapter.description,
        displayOrder: chapter.displayOrder,
      },
      lesson: lessonContent,
      progress: {
        completed: progress?.completed ?? false,
        completedSections: progress?.completedSections ?? [],
        completedAt: progress?.completedAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/chapters/:slug/exercises', async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { slug: req.params.slug },
    });

    if (!chapter || chapter.slug !== 'journal-entries') {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    const progressRows = await prisma.exerciseProgress.findMany({
      where: {
        userId: req.user!.id,
        chapterId: chapter.id,
      },
    });

    const completedMap = new Map(progressRows.map((p) => [p.exerciseId, p]));
    const { businessContext, exercises } = getExercises();

    res.status(200).json({
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
      },
      businessContext,
      exercises: exercises.map((ex) => ({
        ...ex,
        completed: completedMap.get(ex.id)?.completed ?? false,
        completedAt: completedMap.get(ex.id)?.completedAt ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/chapters/:slug/exercises/:exerciseId/solution', async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { slug: req.params.slug },
    });

    if (!chapter || chapter.slug !== 'journal-entries') {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    const { solutions, verificationMarkdown } = getExerciseSolutions();
    const solution = solutions.find((s) => s.exerciseId === req.params.exerciseId);

    if (!solution) {
      res.status(404).json({ error: 'Exercise solution not found.' });
      return;
    }

    res.status(200).json({
      solution,
      verificationMarkdown: solution.number === 5 ? verificationMarkdown : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/chapters/:slug/quiz', async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { slug: req.params.slug },
    });

    if (!chapter || chapter.slug !== 'journal-entries') {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    // Strictly returns questions and A-D options ONLY. Never exposes correct answers!
    const questions = getPublicQuizQuestions();

    res.status(200).json({
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
      },
      totalQuestions: questions.length,
      passingPercentage: 60,
      masteryPercentage: 80,
      recommendedMinutes: 20,
      questions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
