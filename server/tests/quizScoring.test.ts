import { describe, it, expect } from 'vitest';
import { gradeQuizSubmission } from '../src/services/quizService';

const ALL_CORRECT_ANSWERS: Record<string, string> = {
  'q-1': 'B',
  'q-2': 'C',
  'q-3': 'D',
  'q-4': 'A',
  'q-5': 'B',
  'q-6': 'C',
  'q-7': 'A',
  'q-8': 'C',
  'q-9': 'D',
  'q-10': 'B',
};

describe('Backend Quiz Scoring Engine', () => {
  it('awards 10/10 (100%) with mastery for all correct answers', () => {
    const graded = gradeQuizSubmission(ALL_CORRECT_ANSWERS);
    expect(graded.score).toBe(10);
    expect(graded.totalQuestions).toBe(10);
    expect(graded.percentage).toBe(100);
    expect(graded.passed).toBe(true);
    expect(graded.mastery).toBe(true);
    expect(graded.results.every((r) => r.isCorrect)).toBe(true);
  });

  it('calculates exact score and pass/mastery flags for partial scores (6/10)', () => {
    const sixCorrect: Record<string, string> = {
      ...ALL_CORRECT_ANSWERS,
      'q-7': 'D',
      'q-8': 'A',
      'q-9': 'B',
      'q-10': 'D',
    };

    const graded = gradeQuizSubmission(sixCorrect);
    expect(graded.score).toBe(6);
    expect(graded.percentage).toBe(60);
    expect(graded.passed).toBe(true);
    expect(graded.mastery).toBe(false);
    expect(graded.results.filter((r) => !r.isCorrect)).toHaveLength(4);
  });

  it('marks scores below 60% as not passed (3/10)', () => {
    const threeCorrect: Record<string, string> = {
      'q-1': 'B',
      'q-2': 'C',
      'q-3': 'D',
      'q-4': 'D',
      'q-5': 'A',
      'q-6': 'A',
      'q-7': 'B',
      'q-8': 'A',
      'q-9': 'A',
      'q-10': 'A',
    };

    const graded = gradeQuizSubmission(threeCorrect);
    expect(graded.score).toBe(3);
    expect(graded.percentage).toBe(30);
    expect(graded.passed).toBe(false);
    expect(graded.mastery).toBe(false);
  });

  it('rejects incomplete submissions or invalid options', () => {
    const incomplete = { ...ALL_CORRECT_ANSWERS };
    delete incomplete['q-10'];
    expect(() => gradeQuizSubmission(incomplete)).toThrow(/Question 10/);

    const invalidOption = { ...ALL_CORRECT_ANSWERS, 'q-1': 'Z' };
    expect(() => gradeQuizSubmission(invalidOption)).toThrow(/Question 1/);
  });
});
