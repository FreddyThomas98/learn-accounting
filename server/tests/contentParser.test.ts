import { describe, it, expect } from 'vitest';
import {
  loadExercises,
  loadExerciseSolutions,
  loadLessonContent,
  loadPublicQuizQuestions,
  loadQuizAnswerKey,
} from '../src/services/markdownContent';

describe('Authoritative Markdown Content Parser (docs/)', () => {
  it('parses all 14 lesson sections and 5 worked examples accurately', () => {
    const lesson = loadLessonContent();
    expect(lesson.title).toContain('Journal Entries');
    expect(lesson.sections).toHaveLength(14);
    expect(lesson.sections[0].title).toBe('Introduction to Journal Entries');
    expect(lesson.sections[10].number).toBe(11);
    expect(lesson.sections[10].isWorkedExamples).toBe(true);
    expect(lesson.sections[10].markdown).toContain('Mehta Stationery & Office Mart');
    expect(lesson.sections[10].markdown).toContain('3,00,000');
    expect(lesson.sections[13].title).toBe('Chapter Summary');
    expect(lesson.lessonPlanMarkdown).toContain('Chapter Overview');
  });

  it('parses all 5 practical exercises with correct difficulty progression and no solutions', () => {
    const { businessContext, exercises } = loadExercises();
    expect(businessContext).toContain('Kiran Textiles & Garments');
    expect(exercises).toHaveLength(5);
    expect(exercises.map((e) => e.difficulty)).toEqual([
      'Easy',
      'Easy',
      'Moderate',
      'Moderate',
      'Challenging',
    ]);
    expect(exercises[0].markdown).toContain('32,000');
    expect(exercises[4].markdown).toContain('80,000');
    expect(exercises[4].markdown).toContain('6,500');
  });

  it('parses all 5 exercise solutions and grand total verification table', () => {
    const { solutions, verificationMarkdown } = loadExerciseSolutions();
    expect(solutions).toHaveLength(5);
    expect(solutions[0].markdown).toContain('To Sales A/c');
    expect(solutions[2].markdown).toContain('Machinery A/c');
    expect(solutions[3].markdown).toContain('Outstanding Salary A/c');
    expect(solutions[4].markdown).toContain('Depreciation A/c');
    expect(solutions[4].markdown).toContain('Drawings A/c');
    expect(verificationMarkdown).toContain('2,30,000');
  });

  it('parses 10 public quiz questions with 4 options each and zero answer leakage', () => {
    const questions = loadPublicQuizQuestions();
    expect(questions).toHaveLength(10);

    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D']);
      expect('correctOption' in q).toBe(false);
      expect('explanation' in q).toBe(false);
    }
  });

  it('parses the 10-question authoritative answer key accurately', () => {
    const key = loadQuizAnswerKey();
    expect(key).toHaveLength(10);
    expect(key.map((k) => k.correctOption)).toEqual([
      'B',
      'C',
      'D',
      'A',
      'B',
      'C',
      'A',
      'C',
      'D',
      'B',
    ]);
    for (const item of key) {
      expect(item.explanation.length).toBeGreaterThan(20);
    }
  });
});
