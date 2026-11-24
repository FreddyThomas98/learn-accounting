import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { DashboardResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<DashboardResponse>('/api/progress/dashboard')
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading your learning progress...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Dashboard data unavailable.'}
      </div>
    );
  }

  const { course, chapter, summary, recentAttempts } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="inline-block rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-900">
              {course.level}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-navy-900">
              Welcome back, {user?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Continue mastering <strong>{chapter.title}</strong> in {course.title}.
            </p>
          </div>
          <Link
            to="/chapters/journal-entries/lesson"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <span>{summary.completedSectionsCount > 0 ? 'Continue Lesson' : 'Start Chapter 1'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <ProgressBar
            percentage={summary.overallPercentage}
            label="Overall Chapter Mastery Progress"
            sublabel={`${summary.overallPercentage}%`}
          />
        </div>
      </section>

      {/* Progress Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lesson Sections
            </span>
            <BookOpen className="h-4 w-4 text-navy-700" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-navy-900">
            {summary.completedSectionsCount} / {summary.totalSections}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {summary.lessonCompleted ? 'Chapter lesson completed' : 'Sections explored'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Practical Exercises
            </span>
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-navy-900">
            {summary.completedExercisesCount} / {summary.totalExercises}
          </div>
          <p className="mt-1 text-xs text-slate-500">Easy to Challenging drills</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Best Quiz Score
            </span>
            <Award className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-navy-900">
            {summary.bestQuizPercentage !== null ? `${summary.bestQuizPercentage}%` : '—'}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {summary.bestQuizScore !== null
              ? `${summary.bestQuizScore}/10 correct (${summary.quizPassed ? 'Passed' : 'Keep practicing'})`
              : 'Not attempted yet'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quiz Attempts
            </span>
            <ClipboardCheck className="h-4 w-4 text-navy-700" />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-navy-900">
            {summary.quizAttemptsCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Server-graded assessments</p>
        </div>
      </section>

      {/* Study Pathway & Recent Quiz Attempts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">Recommended Study Path</h2>
          <p className="mt-1 text-sm text-slate-500">
            Follow this structured B.Com sequence for Chapter 1: Journal Entries.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              to="/chapters/journal-entries/lesson"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 hover:border-navy-700 hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    summary.lessonCompleted ? 'text-teal-600' : 'text-slate-300'
                  }`}
                />
                <div>
                  <div className="font-semibold text-navy-900">
                    1. Study the Journal Entries Lesson (14 Sections + 5 Worked Examples)
                  </div>
                  <div className="text-xs text-slate-600">
                    Personal, Real & Nominal Accounts, Golden Rules, Modern Equation, and Journal Format.
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>

            <Link
              to="/chapters/journal-entries/exercises"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 hover:border-navy-700 hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    summary.completedExercisesCount === summary.totalExercises
                      ? 'text-teal-600'
                      : 'text-slate-300'
                  }`}
                />
                <div>
                  <div className="font-semibold text-navy-900">
                    2. Solve Five Practical Exercises (Kiran Textiles & Garments)
                  </div>
                  <div className="text-xs text-slate-600">
                    Graded Easy → Moderate → Challenging with on-demand step-by-step solutions.
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>

            <Link
              to="/chapters/journal-entries/quiz"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 hover:border-navy-700 hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    summary.quizPassed ? 'text-teal-600' : 'text-slate-300'
                  }`}
                />
                <div>
                  <div className="font-semibold text-navy-900">
                    3. Take the 10-Question Final MCQ Assessment
                  </div>
                  <div className="text-xs text-slate-600">
                    Verified by the backend with full explanations after submission (Pass: 60%, Mastery: 80%).
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Recent Quiz Attempts</h2>
            <Link to="/quiz-history" className="text-xs font-semibold text-teal-700 hover:underline">
              View All
            </Link>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-sm text-slate-600">No assessment attempts yet.</p>
              <Link
                to="/chapters/journal-entries/quiz"
                className="mt-3 inline-block rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Start Final Quiz
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold tabular-nums text-navy-900">
                      {attempt.score} / {attempt.totalQuestions} ({attempt.percentage}%)
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(attempt.attemptedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      attempt.passed
                        ? 'bg-teal-50 text-teal-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {attempt.passed ? 'Passed' : 'Review'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
