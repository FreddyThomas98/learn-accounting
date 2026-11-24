import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { apiFetch } from '../api/client';
import { CourseItem, LessonResponse } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ProgressBar } from '../components/ProgressBar';

export const CoursePage: React.FC = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [lessonPlan, setLessonPlan] = useState<string>('');
  const [showPlan, setShowPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ courses: CourseItem[] }>('/api/courses'),
      apiFetch<LessonResponse>('/api/chapters/journal-entries/lesson'),
    ])
      .then(([courseRes, lessonRes]) => {
        setCourses(courseRes.courses);
        setLessonPlan(lessonRes.lesson.lessonPlanMarkdown);
      })
      .catch((err) => setError(err.message || 'Unable to load course information.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading Financial Accounting curriculum...
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

  const course = courses[0];
  if (!course) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No courses available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-teal-50 px-3 py-0.5 text-xs font-semibold text-teal-700">
              {course.level}
            </span>
            <h1 className="mt-1.5 text-2xl font-bold text-navy-900">{course.title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{course.description}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Chapters</h2>
        {course.chapters.map((chapter) => {
          const sectionPct = Math.round(
            (chapter.stats.completedSectionsCount / Math.max(chapter.stats.totalSections, 1)) * 100
          );
          const exercisePct = Math.round(
            (chapter.stats.completedExercisesCount / Math.max(chapter.stats.totalExercises, 1)) * 100
          );

          return (
            <div
              key={chapter.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Unit {chapter.displayOrder}
                  </div>
                  <h3 className="mt-1 text-xl font-bold text-navy-900">{chapter.title}</h3>
                  <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{chapter.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlan((prev) => !prev)}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50"
                >
                  {showPlan ? 'Hide Academic Lesson Plan' : 'View Academic Lesson Plan'}
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ProgressBar
                  size="sm"
                  percentage={chapter.stats.lessonCompleted ? 100 : sectionPct}
                  label="Lesson Sections Read"
                  sublabel={`${chapter.stats.completedSectionsCount}/${chapter.stats.totalSections}`}
                />
                <ProgressBar
                  size="sm"
                  percentage={exercisePct}
                  label="Practical Exercises Completed"
                  sublabel={`${chapter.stats.completedExercisesCount}/${chapter.stats.totalExercises}`}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <Link
                  to={`/chapters/${chapter.slug}/lesson`}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Open Lesson</span>
                </Link>
                <Link
                  to={`/chapters/${chapter.slug}/exercises`}
                  className="inline-flex items-center gap-2 rounded-lg border border-navy-900 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Practical Exercises ({chapter.stats.totalExercises})</span>
                </Link>
                <Link
                  to={`/chapters/${chapter.slug}/quiz`}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Final MCQ Assessment ({chapter.stats.totalQuizQuestions})</span>
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {showPlan && lessonPlan && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-navy-900">Academic Lesson Plan (Syllabus Guide)</h2>
            <button
              type="button"
              onClick={() => setShowPlan(false)}
              className="text-xs font-semibold text-slate-500 hover:text-navy-900"
            >
              Close
            </button>
          </div>
          <MarkdownRenderer content={lessonPlan} />
        </section>
      )}
    </div>
  );
};
