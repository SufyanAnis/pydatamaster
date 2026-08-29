import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Circle, Clock, Home as HomeIcon, Lightbulb, Sparkles, Zap } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { Markdown } from "../lib/markdown";
import { Icon } from "../lib/icons";
import { colorClasses, cn, pct } from "../lib/utils";
import { CodeBlock } from "../components/CodeBlock";
import { LessonChart } from "../components/LessonChart";
import { Quiz } from "../components/Quiz";
import { AdSlot } from "../components/AdSlot";
import { Button, EmptyState, LinkButton, ProgressBar, Spinner } from "../components/ui";

export default function LessonPage() {
  const { moduleId, lessonId } = useParams();
  const { modules, loading, setTutorContext, setTutorOpen } = useSite();
  const { user, progress, completeLesson, submitQuiz } = useAuth();
  const [marking, setMarking] = useState(false);

  const module = modules.find((m) => m.id === moduleId);
  const lesson = module?.lessons.find((l) => l.id === lessonId);
  usePageTitle(lesson ? `${lesson.title} - ${module?.title ?? ""}` : "Lesson");

  useEffect(() => {
    if (lesson && module) setTutorContext({ lessonTitle: lesson.title, moduleTitle: module.title, code: lesson.codeExample });
    return () => setTutorContext({ lessonTitle: undefined, moduleTitle: undefined, code: undefined });
  }, [lesson, module, setTutorContext]);

  const nav = useMemo(() => {
    if (!module || !lesson) return { prev: null as string | null, next: null as string | null, index: 0, isLastOverall: false };
    const li = module.lessons.findIndex((l) => l.id === lesson.id);
    const mi = modules.findIndex((m) => m.id === module.id);
    let prev: string | null = null;
    let next: string | null = null;
    if (li > 0) prev = `/lesson/${module.id}/${module.lessons[li - 1].id}`;
    else if (mi > 0) {
      const pm = modules[mi - 1];
      if (pm.lessons.length) prev = `/lesson/${pm.id}/${pm.lessons[pm.lessons.length - 1].id}`;
    }
    if (li < module.lessons.length - 1) next = `/lesson/${module.id}/${module.lessons[li + 1].id}`;
    else if (mi < modules.length - 1) {
      const nm = modules[mi + 1];
      if (nm.lessons.length) next = `/lesson/${nm.id}/${nm.lessons[0].id}`;
    }
    return { prev, next, index: li, isLastOverall: !next };
  }, [module, lesson, modules]);

  if (loading) return <Spinner label="Loading lesson" />;
  if (!module || !lesson)
    return (
      <EmptyState
        title="Lesson not found"
        description="This lesson may have been moved or unpublished."
        action={
          <LinkButton to="/courses" variant="dark">
            Browse courses
          </LinkButton>
        }
      />
    );

  const c = colorClasses(module.color);
  const completedSet = new Set(progress?.completedLessons ?? []);
  const isDone = completedSet.has(lesson.id);
  const moduleDone = module.lessons.filter((l) => completedSet.has(l.id)).length;

  const markComplete = async () => {
    setMarking(true);
    try {
      await completeLesson(lesson.id);
    } finally {
      setMarking(false);
    }
  };

  const onQuizComplete = async (score: number, total: number) => {
    if (!user) return;
    await submitQuiz(lesson.id, score, total);
    if (!isDone) await completeLesson(lesson.id);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-10 relative">
      <article className="min-w-0 max-w-4xl">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 flex-wrap">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
            <HomeIcon size={12} /> Home
          </Link>
          <ChevronRight size={10} />
          <Link to="/courses" className="hover:text-blue-600">
            Courses
          </Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 dark:text-slate-300">{module.title}</span>
          <ChevronRight size={10} />
          <span className="text-blue-600">{lesson.title}</span>
        </nav>

        <AdSlot slot="header" className="h-24 mb-8" />

        <header className="mb-10 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", c.bg, c.text, c.border)}>
              <Icon name={module.icon} size={12} /> {module.library || module.title}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Lesson {nav.index + 1} of {module.lessons.length}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {lesson.durationMin} min
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1">
              <Zap size={11} /> {lesson.xp} XP
            </span>
            {isDone && (
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.05] mb-5">{lesson.title}</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{lesson.summary}</p>
        </header>

        <div className="space-y-10">
          <Markdown content={lesson.content} className="prose-lg" />

          {lesson.codeExample && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Code example</h3>
              <CodeBlock code={lesson.codeExample} filename={`${lesson.id}.py`} />
            </section>
          )}

          {lesson.chartType !== "none" && <LessonChart type={lesson.chartType} lessonId={lesson.id} />}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shrink-0">
              <Lightbulb size={22} />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-blue-900 dark:text-blue-100 mb-1 tracking-tight">Stuck on this concept?</h4>
              <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed font-medium">
                The AI tutor already knows you're on <strong>{lesson.title}</strong>. Ask it things like <em>"Explain line 3 of the code above"</em> or <em>"Give me a practice exercise"</em>.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setTutorOpen(true)} className="shrink-0">
              <Sparkles size={14} /> Ask tutor
            </Button>
          </div>

          {lesson.quiz.length > 0 && <Quiz key={lesson.id} questions={lesson.quiz} onComplete={onQuizComplete} />}

          {!user && (
            <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-dashed">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Create a free profile</strong> to save your progress, earn XP for this lesson and unlock badges.
              </p>
              <LinkButton to="/signup" variant="dark" size="sm">
                Join free
              </LinkButton>
            </div>
          )}
          {user && !isDone && (
            <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Finished reading and running the code? Mark this lesson complete to earn {lesson.xp} XP.</p>
              <Button onClick={markComplete} loading={marking} className="shrink-0">
                <CheckCircle2 size={16} /> Mark complete
              </Button>
            </div>
          )}

          <AdSlot slot="content" className="h-48" />
        </div>

        <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          {nav.prev ? (
            <Link to={nav.prev} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-all">
              <ArrowLeft size={18} />
              <span className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Previous</span>
                <span className="font-bold text-sm">Lesson</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {nav.next ? (
            <Link to={nav.next} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
              <span className="text-right">
                <span className="block text-[10px] font-black uppercase tracking-widest text-blue-200">Next</span>
                <span className="font-bold text-sm">Continue learning</span>
              </span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to={user ? "/progress" : "/courses"} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">
              <span className="font-bold text-sm">Finish course</span>
              <CheckCircle2 size={18} />
            </Link>
          )}
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("p-2 rounded-xl", c.bg, c.text)}>
                <Icon name={module.icon} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Module</p>
                <p className="font-black text-sm text-slate-900 dark:text-white truncate">{module.title}</p>
              </div>
            </div>
            {user && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  <span>
                    {moduleDone}/{module.lessons.length} done
                  </span>
                  <span className={c.text}>{pct(moduleDone, module.lessons.length)}%</span>
                </div>
                <ProgressBar value={pct(moduleDone, module.lessons.length)} className="h-2" />
              </div>
            )}
            <ol className="space-y-1">
              {module.lessons.map((l, i) => {
                const active = l.id === lesson.id;
                const done = completedSet.has(l.id);
                return (
                  <li key={l.id}>
                    <Link to={`/lesson/${module.id}/${l.id}`} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors", active ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                      {done ? <CheckCircle2 size={14} className={active ? "text-white" : "text-emerald-500"} /> : <Circle size={14} className={active ? "text-blue-200" : "text-slate-300 dark:text-slate-600"} />}
                      <span className="truncate">
                        {i + 1}. {l.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
          <AdSlot slot="sidebar" className="h-64" />
        </div>
      </aside>
    </div>
  );
}
