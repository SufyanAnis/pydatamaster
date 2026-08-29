import { useState } from "react";
import { ArrowRight, CheckCircle2, HelpCircle, RotateCcw, XCircle, Trophy } from "lucide-react";
import type { QuizQuestion } from "../lib/types";
import { cn } from "../lib/utils";

export function Quiz({ questions, onComplete }: { questions: QuizQuestion[]; onComplete?: (score: number, total: number) => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = questions[index];

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.correctAnswer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      onComplete?.(score, questions.length);
    }
  };

  const retry = () => {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const perfect = score === questions.length;
    return (
      <div className="card p-8 text-center animate-fade-in-up">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", perfect ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30")}>
          {perfect ? <Trophy size={30} /> : <CheckCircle2 size={30} />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{perfect ? "Perfect score!" : "Quiz completed!"}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
          You scored <span className="font-black text-blue-600">{score}</span> out of <span className="font-black text-slate-900 dark:text-white">{questions.length}</span>
        </p>
        <button onClick={retry} className="btn-dark px-6 py-3">
          <RotateCcw size={16} /> Retry quiz
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-600" />
          <h3 className="font-black text-slate-900 dark:text-white tracking-tight">Knowledge Check</h3>
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          Question {index + 1} of {questions.length}
        </span>
      </div>
      <div className="p-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">{q.question}</h4>
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let cls = "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800";
            let icon = null;
            if (answered) {
              if (i === q.correctAnswer) {
                cls = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-200";
                icon = <CheckCircle2 size={20} className="text-emerald-600" />;
              } else if (i === selected) {
                cls = "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-800 dark:text-red-200";
                icon = <XCircle size={20} className="text-red-500" />;
              } else cls = "border-slate-100 dark:border-slate-800 opacity-50";
            } else if (selected === i) cls = "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
            return (
              <button key={i} onClick={() => choose(i)} disabled={answered} className={cn("w-full flex items-center justify-between gap-3 text-left px-5 py-4 rounded-2xl border-2 transition-all font-medium text-slate-800 dark:text-slate-200", cls)}>
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-black flex items-center justify-center text-slate-500 shrink-0">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </span>
                {icon}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl px-5 py-4 text-sm text-blue-900 dark:text-blue-100 font-medium mb-4">
              <strong>Explanation:</strong> {q.explanation}
            </div>
            <div className="flex justify-end">
              <button onClick={next} className="btn-primary px-6 py-3">
                {index < questions.length - 1 ? "Next question" : "View results"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
