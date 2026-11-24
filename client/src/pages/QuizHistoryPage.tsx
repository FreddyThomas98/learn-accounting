import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Eye, History, XCircle } from 'lucide-react';
import { apiFetch } from '../api/client';
import { GradedAttemptResponse, QuizAttemptSummary } from '../types';

export const QuizHistoryPage: React.FC = () => {
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<GradedAttemptResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ attempts: QuizAttemptSummary[] }>('/api/quiz/attempts')
      .then((res) => setAttempts(res.attempts))
      .catch((err) => setError(err.message || 'Unable to load quiz history.'))
      .finally(() => setLoading(false));
  }, []);

  const handleInspect = async (attemptId: string) => {
    if (selectedAttempt?.attemptId === attemptId) {
      setSelectedAttempt(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const detail = await apiFetch<GradedAttemptResponse>(`/api/quiz/attempts/${attemptId}`);
      setSelectedAttempt(detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading your quiz attempt history...
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700">
              <History className="h-4 w-4" />
              <span>Performance Record</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-navy-900">Quiz Attempt History</h1>
            <p className="mt-1 text-sm text-slate-600">
              Review all past assessment scores and inspect answer explanations saved in your account.
            </p>
          </div>
          <Link
            to="/chapters/journal-entries/quiz"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>New Quiz Attempt</span>
          </Link>
        </div>
      </section>

      {attempts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            You have not completed any assessments yet.
          </p>
          <Link
            to="/chapters/journal-entries/quiz"
            className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Take Chapter 1 Assessment
          </Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead className="bg-navy-900 text-xs uppercase tracking-wider text-white">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Chapter</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Percentage</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-slate-700">
                      {new Date(attempt.attemptedAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-navy-900">
                      {attempt.chapterTitle}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-navy-900">
                      {attempt.score} / {attempt.totalQuestions}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-navy-900">
                      {attempt.percentage}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          attempt.mastery
                            ? 'bg-teal-50 text-teal-700'
                            : attempt.passed
                              ? 'bg-navy-50 text-navy-900'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {attempt.mastery ? 'Mastery' : attempt.passed ? 'Passed' : 'Needs Review'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspect(attempt.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>
                          {selectedAttempt?.attemptId === attempt.id ? 'Close' : 'Review Answers'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loadingDetail && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading attempt breakdown...
        </div>
      )}

      {selectedAttempt && !loadingDetail && (
        <section className="space-y-4 rounded-xl border border-navy-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">
                Attempt Review — {selectedAttempt.score}/{selectedAttempt.totalQuestions} (
                {selectedAttempt.percentage}%)
              </h2>
              <p className="text-xs text-slate-500">
                Attempted on {new Date(selectedAttempt.attemptedAt).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAttempt(null)}
              className="text-xs font-semibold text-slate-500 hover:text-navy-900"
            >
              Close Review
            </button>
          </div>

          <div className="space-y-3">
            {selectedAttempt.results.map((item) => (
              <div
                key={item.questionId}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-navy-900">
                    Q{item.number} ({item.difficulty})
                  </span>
                  {item.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                      <XCircle className="h-3.5 w-3.5" /> Incorrect (Selected {item.selectedOption},
                      Correct {item.correctOption})
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-800">{item.prompt}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <strong className="text-navy-900">Explanation:</strong> {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
