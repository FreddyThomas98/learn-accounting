export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  createdAt: string;
}

export interface ChapterStats {
  totalSections: number;
  completedSectionsCount: number;
  lessonCompleted: boolean;
  totalExercises: number;
  completedExercisesCount: number;
  totalQuizQuestions: number;
  quizAttemptsCount: number;
  bestQuizPercentage: number | null;
}

export interface ChapterSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  displayOrder: number;
  stats: ChapterStats;
}

export interface CourseItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  createdAt: string;
  chapters: ChapterSummary[];
}

export interface DashboardResponse {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    level: string;
  };
  chapter: {
    id: string;
    slug: string;
    title: string;
    description: string;
  };
  summary: {
    overallPercentage: number;
    lessonCompleted: boolean;
    completedSectionsCount: number;
    totalSections: number;
    completedExercisesCount: number;
    totalExercises: number;
    quizAttemptsCount: number;
    bestQuizScore: number | null;
    bestQuizPercentage: number | null;
    quizPassed: boolean;
  };
  recentAttempts: {
    id: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    attemptedAt: string;
    passed: boolean;
  }[];
}

export interface LessonSection {
  id: string;
  number: number;
  title: string;
  markdown: string;
  isWorkedExamples: boolean;
}

export interface LessonResponse {
  course: {
    id: string;
    slug: string;
    title: string;
    level: string;
  };
  chapter: {
    id: string;
    slug: string;
    title: string;
    description: string;
    displayOrder: number;
  };
  lesson: {
    chapterSlug: string;
    title: string;
    metadata: {
      course: string;
      level: string;
      framework: string;
      currencyNote: string;
    };
    sections: LessonSection[];
    lessonPlanMarkdown: string;
  };
  progress: {
    completed: boolean;
    completedSections: string[];
    completedAt: string | null;
  };
}

export interface ExerciseItem {
  id: string;
  number: number;
  title: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  date: string;
  transactionSummary: string;
  markdown: string;
  completed: boolean;
  completedAt: string | null;
}

export interface ExercisesResponse {
  chapter: {
    id: string;
    slug: string;
    title: string;
  };
  businessContext: string;
  exercises: ExerciseItem[];
}

export interface ExerciseSolutionResponse {
  solution: {
    exerciseId: string;
    number: number;
    title: string;
    markdown: string;
  };
  verificationMarkdown: string | null;
}

export interface PublicQuizQuestion {
  id: string;
  number: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  prompt: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
}

export interface QuizLoadResponse {
  chapter: {
    id: string;
    slug: string;
    title: string;
  };
  totalQuestions: number;
  passingPercentage: number;
  masteryPercentage: number;
  recommendedMinutes: number;
  questions: PublicQuizQuestion[];
}

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

export interface GradedAttemptResponse {
  attemptId: string;
  chapterSlug: string;
  chapterTitle: string;
  attemptedAt: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  mastery: boolean;
  results: GradedQuestionResult[];
}

export interface QuizAttemptSummary {
  id: string;
  chapterSlug: string;
  chapterTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  mastery: boolean;
  attemptedAt: string;
}
