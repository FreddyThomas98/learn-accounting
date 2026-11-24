import fs from 'fs';
import path from 'path';

export interface LessonSection {
  id: string;
  number: number;
  title: string;
  markdown: string;
  isWorkedExamples: boolean;
}

export interface LessonContent {
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
}

export interface ExerciseItem {
  id: string;
  number: number;
  title: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  date: string;
  transactionSummary: string;
  markdown: string;
}

export interface ExerciseSolutionItem {
  exerciseId: string;
  number: number;
  title: string;
  markdown: string;
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

export interface QuizAnswerKeyItem {
  questionId: string;
  number: number;
  correctOption: 'A' | 'B' | 'C' | 'D';
  correctAnswer: string;
  explanation: string;
}

function resolveDocsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'docs'),
    path.resolve(__dirname, '../../../docs'),
    path.resolve(__dirname, '../../../../docs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'content', 'journal-entries-lesson.md'))) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate authoritative docs/ directory. Checked: ${candidates.join(', ')}`
  );
}

function readDocFile(relativePath: string): string {
  const docsDir = resolveDocsDir();
  const fullPath = path.join(docsDir, relativePath);
  return fs.readFileSync(fullPath, 'utf-8').replace(/\r\n/g, '\n');
}

function stripLocalFileLinks(md: string): string {
  return md.replace(/\[([^\]]+)\]\(file:\/\/\/[^)]+\)/g, '**$1**');
}

export function loadLessonContent(): LessonContent {
  const rawLesson = stripLocalFileLinks(readDocFile('content/journal-entries-lesson.md'));
  const rawPlan = stripLocalFileLinks(readDocFile('curriculum/lesson-plan.md'));

  const titleMatch = rawLesson.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Chapter 1: Journal Entries';

  const sectionRegex = /^##\s+(\d+)\.\s+(.+)$/gm;
  const matches = [...rawLesson.matchAll(sectionRegex)];

  const sections: LessonSection[] = matches.map((match, idx) => {
    const number = Number(match[1]);
    const sectionTitle = match[2].trim();
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = idx + 1 < matches.length ? (matches[idx + 1].index ?? rawLesson.length) : rawLesson.length;
    const body = rawLesson
      .slice(startIndex, endIndex)
      .replace(/^\s*---\s*$/gm, (line, offset, str) => {
        // Keep internal horizontal rules (e.g., between worked examples), trim only trailing delimiter
        return offset > str.length - 10 ? '' : line;
      })
      .trim();

    return {
      id: `section-${number}`,
      number,
      title: sectionTitle,
      markdown: body,
      isWorkedExamples: number === 11,
    };
  });

  return {
    chapterSlug: 'journal-entries',
    title,
    metadata: {
      course: 'Financial Accounting (First-Year B.Com)',
      level: 'Beginner',
      framework: 'Traditional Approach (Personal, Real, and Nominal Accounts)',
      currencyNote: 'Indian Rupees (₹) — introductory transactions exclude GST',
    },
    sections,
    lessonPlanMarkdown: rawPlan,
  };
}

export function loadExercises(): {
  businessContext: string;
  exercises: ExerciseItem[];
} {
  const raw = stripLocalFileLinks(readDocFile('content/practical-exercises.md'));
  const contextMatch = raw.match(/\*\*Business Context:\*\*\s*(.+)/);
  const businessContext = contextMatch
    ? contextMatch[1].trim()
    : 'Kiran Textiles & Garments (Jaipur), March 2026.';

  const exRegex = /^##\s+Exercise\s+(\d+)\s+[–-]\s+(Easy|Moderate|Challenging):\s+(.+)$/gm;
  const matches = [...raw.matchAll(exRegex)];

  const exercises: ExerciseItem[] = matches.map((match, idx) => {
    const number = Number(match[1]);
    const difficulty = match[2] as 'Easy' | 'Moderate' | 'Challenging';
    const title = match[3].trim();
    const startIndex = (match.index ?? 0) + match[0].length;
    let endIndex = idx + 1 < matches.length ? (matches[idx + 1].index ?? raw.length) : raw.length;

    // Trim trailing footer after the last exercise
    let body = raw.slice(startIndex, endIndex).trim();
    body = body.replace(/\n---\s*\n\*Once you have completed[\s\S]*$/i, '').replace(/\n---\s*$/, '').trim();

    const dateMatch = body.match(/\*\*Date:\*\*\s*(.+)/);
    const txMatch = body.match(/\*\*Transaction Details:\*\*\s*(.+)/);

    return {
      id: `ex-${number}`,
      number,
      title,
      difficulty,
      date: dateMatch ? dateMatch[1].trim() : '',
      transactionSummary: txMatch ? txMatch[1].trim() : '',
      markdown: body,
    };
  });

  return { businessContext, exercises };
}

export function loadExerciseSolutions(): {
  solutions: ExerciseSolutionItem[];
  verificationMarkdown: string;
} {
  const raw = stripLocalFileLinks(readDocFile('content/exercise-solutions.md'));
  const solRegex = /^##\s+Solution to Exercise\s+(\d+)\s+[–-]\s+(.+)$/gm;
  const matches = [...raw.matchAll(solRegex)];

  const verificationHeading = /^##\s+Overall Mathematical Balance Verification.*$/m;
  const verificationMatch = raw.match(verificationHeading);
  const verificationStart = verificationMatch?.index ?? raw.length;

  const solutions: ExerciseSolutionItem[] = matches.map((match, idx) => {
    const number = Number(match[1]);
    const title = match[2].trim();
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex =
      idx + 1 < matches.length
        ? (matches[idx + 1].index ?? verificationStart)
        : verificationStart;
    const body = raw.slice(startIndex, endIndex).replace(/\n---\s*$/, '').trim();

    return {
      exerciseId: `ex-${number}`,
      number,
      title,
      markdown: body,
    };
  });

  const verificationMarkdown =
    verificationMatch && verificationMatch.index !== undefined
      ? raw.slice(verificationMatch.index).trim()
      : '';

  return { solutions, verificationMarkdown };
}

export function loadPublicQuizQuestions(): PublicQuizQuestion[] {
  const raw = stripLocalFileLinks(readDocFile('content/final-assessment.md'));
  const qRegex = /^###\s+Question\s+(\d+)\s+\*\((Easy|Moderate|Challenging)\)\*$/gm;
  const matches = [...raw.matchAll(qRegex)];

  return matches.map((match, idx) => {
    const number = Number(match[1]);
    const difficulty = match[2] as 'Easy' | 'Moderate' | 'Challenging';
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = idx + 1 < matches.length ? (matches[idx + 1].index ?? raw.length) : raw.length;

    let block = raw.slice(startIndex, endIndex).trim();
    block = block
      .replace(/\n##\s+Section\s+[A-Z]:[\s\S]*$/m, '')
      .replace(/\n---\s*\n\*End of Assessment[\s\S]*$/i, '')
      .replace(/\n---\s*$/, '')
      .trim();

    const optionRegex = /^-\s+\*\*([A-D])\)\*\*\s+(.+)$/gm;
    const optionMatches = [...block.matchAll(optionRegex)];

    const firstOptionIndex = optionMatches[0]?.index ?? block.length;
    const prompt = block.slice(0, firstOptionIndex).trim();

    const options = optionMatches.map((opt) => ({
      key: opt[1] as 'A' | 'B' | 'C' | 'D',
      text: opt[2].trim(),
    }));

    return {
      id: `q-${number}`,
      number,
      difficulty,
      prompt,
      options,
    };
  });
}

// SERVER-ONLY: Never expose this directly to unsubmitted quiz clients!
export function loadQuizAnswerKey(): QuizAnswerKeyItem[] {
  const raw = stripLocalFileLinks(readDocFile('content/answer-key.md'));
  const qRegex = /^###\s+Question\s+(\d+)$/gm;
  const matches = [...raw.matchAll(qRegex)];

  return matches.map((match, idx) => {
    const number = Number(match[1]);
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = idx + 1 < matches.length ? (matches[idx + 1].index ?? raw.length) : raw.length;
    const block = raw.slice(startIndex, endIndex).trim();

    const optMatch = block.match(/\*\*Correct Option:\*\*\s+\*\*([A-D])\*\*/);
    const ansMatch = block.match(/\*\*Correct Answer:\*\*\s+(.+)/);
    const expMatch = block.match(/\*\*Short Explanation:\*\*\s+([\s\S]+?)(?:\n---|$)/);

    if (!optMatch) {
      throw new Error(`Could not parse correct option for Question ${number} in docs/content/answer-key.md`);
    }

    return {
      questionId: `q-${number}`,
      number,
      correctOption: optMatch[1] as 'A' | 'B' | 'C' | 'D',
      correctAnswer: ansMatch ? ansMatch[1].trim() : '',
      explanation: expMatch ? expMatch[1].trim() : '',
    };
  });
}

// Cached accessors for fast runtime performance while preserving docs/ as single source of truth
let cachedLesson: LessonContent | null = null;
let cachedExercises: ReturnType<typeof loadExercises> | null = null;
let cachedSolutions: ReturnType<typeof loadExerciseSolutions> | null = null;
let cachedQuestions: PublicQuizQuestion[] | null = null;
let cachedAnswerKey: QuizAnswerKeyItem[] | null = null;

export function getLessonContent(): LessonContent {
  if (!cachedLesson) cachedLesson = loadLessonContent();
  return cachedLesson;
}

export function getExercises(): ReturnType<typeof loadExercises> {
  if (!cachedExercises) cachedExercises = loadExercises();
  return cachedExercises;
}

export function getExerciseSolutions(): ReturnType<typeof loadExerciseSolutions> {
  if (!cachedSolutions) cachedSolutions = loadExerciseSolutions();
  return cachedSolutions;
}

export function getPublicQuizQuestions(): PublicQuizQuestion[] {
  if (!cachedQuestions) cachedQuestions = loadPublicQuizQuestions();
  return cachedQuestions;
}

export function getQuizAnswerKey(): QuizAnswerKeyItem[] {
  if (!cachedAnswerKey) cachedAnswerKey = loadQuizAnswerKey();
  return cachedAnswerKey;
}
