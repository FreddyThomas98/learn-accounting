import { prisma } from '../db/prisma';
import {
  getPublicQuizQuestions,
  getQuizAnswerKey,
} from './markdownContent';

export interface GradedQuestionResult {
  questionId: string;
  number: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  prompt: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  selectedOption: 'A' | 'B' | 'C' | 'D';
  correctOption: 'A' | 'B' | 'C' | 'D';
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface GradedQuizSummary {
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  mastery: boolean;
  results: GradedQuestionResult[];
}

export function gradeQuizSubmission(
  submittedAnswers: Record<string, string>
): GradedQuizSummary {
  const questions = getPublicQuizQuestions();
  const answerKey = getQuizAnswerKey();

  if (questions.length !== 10 || answerKey.length !== 10) {
    throw new Error('Assessment configuration error: expected exactly 10 quiz questions and answers.');
  }

  const keyById = new Map(answerKey.map((item) => [item.questionId, item]));
  const results: GradedQuestionResult[] = [];
  let score = 0;

  for (const question of questions) {
    const keyItem = keyById.get(question.id);
    if (!keyItem) {
      throw new Error(`Missing answer key entry for ${question.id}`);
    }

    const rawSelection = (submittedAnswers[question.id] || '').trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(rawSelection)) {
      throw new Error(`Invalid or missing option for Question ${question.number}. All 10 questions must be answered.`);
    }

    const selectedOption = rawSelection as 'A' | 'B' | 'C' | 'D';
    const isCorrect = selectedOption === keyItem.correctOption;
    if (isCorrect) score += 1;

    results.push({
      questionId: question.id,
      number: question.number,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options,
      selectedOption,
      correctOption: keyItem.correctOption,
      correctAnswer: keyItem.correctAnswer,
      isCorrect,
      explanation: keyItem.explanation,
    });
  }

  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 10000) / 100;

  return {
    score,
    totalQuestions,
    percentage,
    passed: percentage >= 60,
    mastery: percentage >= 80,
    results,
  };
}

export async function recordQuizAttempt(
  userId: string,
  chapterId: string,
  submittedAnswers: Record<string, string>
) {
  const graded = gradeQuizSubmission(submittedAnswers);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      chapterId,
      score: graded.score,
      totalQuestions: graded.totalQuestions,
      percentage: graded.percentage,
      answers: {
        create: graded.results.map((r) => ({
          questionId: r.questionId,
          selectedOption: r.selectedOption,
          isCorrect: r.isCorrect,
        })),
      },
    },
    include: {
      chapter: {
        select: { slug: true, title: true },
      },
    },
  });

  return {
    attemptId: attempt.id,
    chapterSlug: attempt.chapter.slug,
    chapterTitle: attempt.chapter.title,
    attemptedAt: attempt.attemptedAt,
    ...graded,
  };
}

export async function getAttemptDetailsForUser(userId: string, attemptId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    include: {
      chapter: { select: { slug: true, title: true } },
      answers: true,
    },
  });

  if (!attempt) return null;

  const questions = getPublicQuizQuestions();
  const answerKey = getQuizAnswerKey();
  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const keyMap = new Map(answerKey.map((k) => [k.questionId, k]));

  const results: GradedQuestionResult[] = questions.map((q) => {
    const saved = answerMap.get(q.id);
    const keyItem = keyMap.get(q.id)!;
    const selectedOption = (saved?.selectedOption || 'A') as 'A' | 'B' | 'C' | 'D';

    return {
      questionId: q.id,
      number: q.number,
      difficulty: q.difficulty,
      prompt: q.prompt,
      options: q.options,
      selectedOption,
      correctOption: keyItem.correctOption,
      correctAnswer: keyItem.correctAnswer,
      isCorrect: saved?.isCorrect ?? false,
      explanation: keyItem.explanation,
    };
  });

  return {
    attemptId: attempt.id,
    chapterSlug: attempt.chapter.slug,
    chapterTitle: attempt.chapter.title,
    attemptedAt: attempt.attemptedAt,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    passed: attempt.percentage >= 60,
    mastery: attempt.percentage >= 80,
    results,
  };
}
