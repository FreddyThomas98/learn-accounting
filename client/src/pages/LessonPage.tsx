import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { LessonResponse } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ProgressBar } from '../components/ProgressBar';

export const LessonPage: React.FC = () => {
  const { slug = 'journal-entries' } = useParams();
  const [data, setData] = useState<LessonResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<LessonResponse>(`/api/chapters/${slug}/lesson`)
      .then((res) => {
        setData(res);
        setCompletedSections(res.progress.completedSections);
        setLessonCompleted(res.progress.completed);
      })
      .catch((err) => setError(err.message || 'Unable to load lesson.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const markSectionVisited = useCallback(
    async (sectionId: string) => {
      if (completedSections.includes(sectionId)) return;
      try {
        const res = await apiFetch<{
          progress: { completed: boolean; completedSections: string[] };
        }>('/api/progress/lesson', {
          method: 'POST',
          body: JSON.stringify({ chapterSlug: slug, sectionId }),
        });
        setCompletedSections(res.progress.completedSections);
        setLessonCompleted(res.progress.completed);
      } catch {
        // Non-blocking background progress save
      }
    },
    [completedSections, slug]
  );

  useEffect(() => {
    if (!data) return;
    const current = data.lesson.sections[activeIndex];
    if (current) {
      markSectionVisited(current.id);
    }
  }, [data, activeIndex, markSectionVisited]);

  const toggleLessonComplete = async () => {
    setSaving(true);
    try {
      const nextCompleted = !lessonCompleted;
      const res = await apiFetch<{
        progress: { completed: boolean; completedSections: string[] };
      }>('/api/progress/lesson', {
        method: 'POST',
        body: JSON.stringify({ chapterSlug: slug, completed: nextCompleted }),
      });
      setLessonCompleted(res.progress.completed);
      setCompletedSections(res.progress.completedSections);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading Journal Entries lesson...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Lesson could not be loaded.'}
      </div>
    );
  }

  const sections = data.lesson.sections;
  const activeSection = sections[activeIndex];
  const sectionPct = Math.round((completedSections.length / Math.max(sections.length, 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Chapter Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-navy-900">
                {data.lesson.metadata.course}
              </span>
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-teal-700">
                {data.lesson.metadata.framework}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-navy-900">{data.lesson.title}</h1>
            <p className="mt-1 text-xs text-slate-500">{data.lesson.metadata.currencyNote}</p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={toggleLessonComplete}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              lessonCompleted
                ? 'border border-teal-600 bg-teal-50 text-teal-700 hover:bg-teal-100'
                : 'bg-navy-900 text-white hover:bg-navy-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{lessonCompleted ? 'Lesson Completed' : 'Mark Lesson Complete'}</span>
          </button>
        </div>

        <div className="mt-4">
          <ProgressBar
            size="sm"
            percentage={lessonCompleted ? 100 : sectionPct}
            label="Section Reading Progress"
            sublabel={`${completedSections.length} of ${sections.length} sections visited`}
          />
        </div>
      </section>

      {/* Main Split: Section Navigation + Active Section Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Section Index */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:sticky lg:top-20">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-semibold uppercase tracking-wider text-navy-900">
              <BookOpen className="h-4 w-4 text-teal-600" />
              <span>Lesson Sections ({sections.length})</span>
            </div>
            <ol className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
              {sections.map((section, idx) => {
                const isActive = idx === activeIndex;
                const isVisited = completedSections.includes(section.id);
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-navy-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-navy-900'
                      }`}
                    >
                      {isVisited ? (
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isActive ? 'text-teal-300' : 'text-teal-600'
                          }`}
                        />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40" />
                      )}
                      <span>
                        {section.number}. {section.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Active Lesson Content */}
        <article className="lg:col-span-8 xl:col-span-9">
          {activeSection && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs md:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Section {activeSection.number} of {sections.length}
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-navy-900 md:text-2xl">
                    {activeSection.number}. {activeSection.title}
                  </h2>
                </div>
                {activeSection.isWorkedExamples && (
                  <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-900">
                    5 Worked Indian Business Examples
                  </span>
                )}
              </div>

              <MarkdownRenderer content={activeSection.markdown} />

              {/* Bottom Section Pagination */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => {
                    setActiveIndex((prev) => Math.max(0, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous Section</span>
                </button>

                {activeIndex < sections.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIndex((prev) => Math.min(sections.length - 1, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    <span>Next Section</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to={`/chapters/${slug}/exercises`}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Proceed to Practical Exercises</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};
