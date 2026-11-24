import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  History,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';
import { GradedAttemptResponse, QuizLoadResponse } from '../types';
import { ProgressBar } from '../components/ProgressBar';

export const QuizPage: React.FC = () => {
  const { slug = 'journal-entries' } = useParams();
  const [quiz, setQuiz] = useState<QuizLoadResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [result, setResult] = useState<GradedAttemptResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<QuizLoadResponse>(`/api/chapters/${slug}/quiz`)
      .then(setQuiz)
      .catch((err) => setError(err.message || 'Unable to load final assessment.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSelectOption = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setError('');
    if (Object.keys(answers).length < quiz.totalQuestions) {
      setError(`Please answer all ${quiz.totalQuestions} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      const graded = await apiFetch<GradedAttemptResponse>('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({
          chapterSlug: slug,
          answers,
        }),
      });
      setResult(graded);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to grade quiz right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading 10-question final assessment...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Assessment unavailable.'}
      </div>
    );
  }

  // Results & Answer Explanations View (returned by backend only AFTER submission)
  if (result) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  result.passed ? 'bg-teal-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                    result.mastery
                      ? 'bg-teal-50 text-teal-700'
                      : result.passed
                        ? 'bg-navy-50 text-navy-900'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {result.mastery
                    ? 'Mastery Achieved (80%+)'
                    : result.passed
                      ? 'Assessment Passed (60%+)'
                      : 'Needs Review (< 60%)'}
                </span>
                <h1 className="mt-1.5 text-2xl font-bold tabular-nums text-navy-900">
                  Your Score: {result.score} / {result.totalQuestions} ({result.percentage}%)
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Verified and saved by the server on{' '}
                  {new Date(result.attemptedAt).toLocaleString('en-IN')}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retake Quiz</span>
              </button>
              <Link
                to="/quiz-history"
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                <History className="h-4 w-4" />
                <span>Attempt History</span>
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar
              percentage={result.percentage}
              label="Assessment Score"
              sublabel={`${result.score} / ${result.totalQuestions}`}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-navy-900">
            Detailed Answer Key & Explanations
          </h2>
          {result.results.map((item) => (
            <div
              key={item.questionId}
              className={`rounded-xl border bg-white p-5 shadow-xs ${
                item.isCorrect ? 'border-teal-200' : 'border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                    Question {item.number}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {item.difficulty}
                  </span>
                </div>
                {item.isCorrect ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Correct</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Incorrect</span>
                  </span>
                )}
              </div>

              <p className="mt-2.5 text-sm font-medium text-slate-900">{item.prompt}</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 px-3.5 py-2 text-xs">
                  <span className="font-semibold text-slate-500">Your Answer: </span>
                  <span
                    className={`font-bold ${
                      item.isCorrect ? 'text-teal-700' : 'text-red-700'
                    }`}
                  >
                    Option {item.selectedOption}
                  </span>
                </div>
                <div className="rounded-lg bg-teal-50 px-3.5 py-2 text-xs">
                  <span className="font-semibold text-teal-800">Correct Answer: </span>
                  <span className="font-bold text-teal-900">
                    Option {item.correctOption} — {item.correctAnswer}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border-l-4 border-navy-900 bg-navy-50/60 px-4 py-3 text-xs leading-relaxed text-slate-700">
                <strong className="text-navy-900">Explanation: </strong>
                {item.explanation}
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // Interactive Quiz View (before submission)
  const answeredCount = Object.keys(answers).length;
  const activeQuestion = quiz.questions[currentIndex];
  const progressPct = Math.round((answeredCount / quiz.totalQuestions) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <ClipboardCheck className="h-4 w-4" />
              <span>Summative Assessment</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-navy-900">
              Final Assessment: {quiz.chapter.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {quiz.totalQuestions} Multiple-Choice Questions · Recommended Time:{' '}
              {quiz.recommendedMinutes} mins · Pass: {quiz.passingPercentage}% · Mastery:{' '}
              {quiz.masteryPercentage}%
            </p>
          </div>
          <div className="rounded-lg bg-navy-50 px-4 py-2 text-right">
            <div className="text-xs text-slate-500">Answered</div>
            <div className="text-lg font-bold tabular-nums text-navy-900">
              {answeredCount} / {quiz.totalQuestions}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar size="sm" percentage={progressPct} />
        </div>

        {/* Question Jump Navigation */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quiz.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = !!answers[q.id];
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-9 w-9 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                  isCurrent
                    ? 'bg-navy-900 text-white'
                    : isAnswered
                      ? 'border border-teal-500 bg-teal-50 text-teal-800'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
                aria-label={`Jump to Question ${q.number}`}
              >
                {q.number}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {activeQuestion && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs md:p-8">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
              Question {activeQuestion.number} of {quiz.totalQuestions}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                activeQuestion.difficulty === 'Easy'
                  ? 'bg-teal-50 text-teal-700'
                  : activeQuestion.difficulty === 'Moderate'
                    ? 'bg-navy-50 text-navy-900'
                    : 'bg-amber-50 text-amber-800'
              }`}
            >
              {activeQuestion.difficulty}
            </span>
          </div>

          <h2 className="mt-4 text-base font-semibold leading-relaxed text-navy-900 md:text-lg">
            {activeQuestion.prompt}
          </h2>

          <div className="mt-5 space-y-3" role="radiogroup" aria-label={`Question ${activeQuestion.number}`}>
            {activeQuestion.options.map((opt) => {
              const selected = answers[activeQuestion.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectOption(activeQuestion.id, opt.key)}
                  className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition-colors ${
                    selected
                      ? 'border-navy-900 bg-navy-50 text-navy-900 ring-1 ring-navy-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected
                        ? 'bg-navy-900 text-white'
                        : 'border border-slate-300 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="leading-relaxed">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              {currentIndex < quiz.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || answeredCount < quiz.totalQuestions}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>
                    {submitting
                      ? 'Grading on Server...'
                      : `Submit Assessment (${answeredCount}/${quiz.totalQuestions})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
