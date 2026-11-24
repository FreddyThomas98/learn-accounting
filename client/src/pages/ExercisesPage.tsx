import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import {
  ExerciseItem,
  ExercisesResponse,
  ExerciseSolutionResponse,
} from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ProgressBar } from '../components/ProgressBar';

function difficultyBadge(level: ExerciseItem['difficulty']) {
  if (level === 'Easy') return 'bg-teal-50 text-teal-700 border-teal-200';
  if (level === 'Moderate') return 'bg-navy-50 text-navy-900 border-navy-100';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

export const ExercisesPage: React.FC = () => {
  const { slug = 'journal-entries' } = useParams();
  const [businessContext, setBusinessContext] = useState('');
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [openSolutions, setOpenSolutions] = useState<Record<string, ExerciseSolutionResponse>>({});
  const [visibleSolutions, setVisibleSolutions] = useState<Record<string, boolean>>({});
  const [loadingSolution, setLoadingSolution] = useState<Record<string, boolean>>({});
  const [togglingProgress, setTogglingProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<ExercisesResponse>(`/api/chapters/${slug}/exercises`)
      .then((res) => {
        setBusinessContext(res.businessContext);
        setExercises(res.exercises);
      })
      .catch((err) => setError(err.message || 'Unable to load exercises.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleToggleSolution = async (exerciseId: string) => {
    const currentlyVisible = !!visibleSolutions[exerciseId];
    if (currentlyVisible) {
      setVisibleSolutions((prev) => ({ ...prev, [exerciseId]: false }));
      return;
    }

    if (!openSolutions[exerciseId]) {
      setLoadingSolution((prev) => ({ ...prev, [exerciseId]: true }));
      try {
        const res = await apiFetch<ExerciseSolutionResponse>(
          `/api/chapters/${slug}/exercises/${exerciseId}/solution`
        );
        setOpenSolutions((prev) => ({ ...prev, [exerciseId]: res }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to fetch exercise solution.');
        return;
      } finally {
        setLoadingSolution((prev) => ({ ...prev, [exerciseId]: false }));
      }
    }

    setVisibleSolutions((prev) => ({ ...prev, [exerciseId]: true }));
  };

  const handleToggleComplete = async (exercise: ExerciseItem) => {
    setTogglingProgress((prev) => ({ ...prev, [exercise.id]: true }));
    try {
      const nextCompleted = !exercise.completed;
      await apiFetch('/api/progress/exercise', {
        method: 'POST',
        body: JSON.stringify({
          chapterSlug: slug,
          exerciseId: exercise.id,
          completed: nextCompleted,
        }),
      });
      setExercises((prev) =>
        prev.map((item) =>
          item.id === exercise.id ? { ...item, completed: nextCompleted } : item
        )
      );
    } finally {
      setTogglingProgress((prev) => ({ ...prev, [exercise.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading practical exercises...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const completedCount = exercises.filter((e) => e.completed).length;
  const completionPct = Math.round((completedCount / Math.max(exercises.length, 1)) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Chapter 1 Practice Lab</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-navy-900">
              Practical Exercises: Journal Entries
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">{businessContext}</p>
          </div>
          <Link
            to={`/chapters/${slug}/quiz`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Take Final Assessment</span>
          </Link>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <ProgressBar
            size="sm"
            percentage={completionPct}
            label="Exercises Completed"
            sublabel={`${completedCount} of ${exercises.length} completed`}
          />
        </div>
      </section>

      <div className="space-y-6">
        {exercises.map((exercise) => {
          const isVisible = !!visibleSolutions[exercise.id];
          const solData = openSolutions[exercise.id];
          const isLoadingSol = !!loadingSolution[exercise.id];

          return (
            <section
              key={exercise.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-navy-700">
                      Exercise {exercise.number}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficultyBadge(
                        exercise.difficulty
                      )}`}
                    >
                      {exercise.difficulty}
                    </span>
                    {exercise.completed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-navy-900">{exercise.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isLoadingSol}
                    onClick={() => handleToggleSolution(exercise.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900 bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-navy-50"
                  >
                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>
                      {isLoadingSol
                        ? 'Loading...'
                        : isVisible
                          ? 'Hide Solution'
                          : 'Show Solution'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!!togglingProgress[exercise.id]}
                    onClick={() => handleToggleComplete(exercise)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
                      exercise.completed
                        ? 'border border-teal-600 bg-teal-50 text-teal-700 hover:bg-teal-100'
                        : 'bg-navy-900 text-white hover:bg-navy-800'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{exercise.completed ? 'Completed' : 'Mark Completed'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <MarkdownRenderer content={exercise.markdown} />
              </div>

              {isVisible && solData && (
                <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/40 p-5">
                  <div className="mb-3 flex items-center justify-between border-b border-teal-200/70 pb-2.5">
                    <h3 className="text-base font-bold text-navy-900">
                      Step-by-Step Solution — Exercise {exercise.number}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleToggleSolution(exercise.id)}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Hide
                    </button>
                  </div>
                  <MarkdownRenderer content={solData.solution.markdown} />
                  {solData.verificationMarkdown && (
                    <div className="mt-6 border-t border-teal-200 pt-4">
                      <MarkdownRenderer content={solData.verificationMarkdown} />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
