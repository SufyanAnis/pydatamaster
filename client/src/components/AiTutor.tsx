import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Maximize2, MessageSquare, Minimize2, Send, Sparkles, Trash2, X } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { ChatMessage } from "../lib/types";
import { useSite } from "../context/SiteContext";
import { useAuth } from "../context/AuthContext";
import { Markdown } from "../lib/markdown";
import { cn } from "../lib/utils";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "model",
  text: "Hi! I'm your **PyData Tutor**. Ask me anything about NumPy, Pandas, Matplotlib or Scikit-Learn - or paste an error message and I'll help you fix it.",
  timestamp: 0,
};

const STORAGE_KEY = "pdm_tutor_chat";

function loadChat(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [WELCOME];
}

export function AiTutor() {
  const { settings, tutorContext, tutorOpen, setTutorOpen } = useSite();
  const { user } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChat);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    if (tutorOpen && !minimized) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, tutorOpen, minimized, busy]);

  const suggestions = useMemo(() => {
    if (tutorContext.code && tutorContext.page === "/playground") return ["Explain what my code does", "Why am I getting this error?", "How can I make this code faster?"];
    if (tutorContext.lessonTitle) return [`Summarize "${tutorContext.lessonTitle}"`, "Explain the code example line by line", "Give me a practice exercise for this lesson"];
    return ["What's the difference between a Series and a DataFrame?", "How do I remove missing values in Pandas?", "Explain NumPy broadcasting simply"];
  }, [tutorContext]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const userMsg: ChatMessage = { id: String(Date.now()), role: "user", text: content, timestamp: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const payload = history.filter((m) => m.id !== "welcome").slice(-12).map((m) => ({ role: m.role, text: m.text }));
      const res = await api.post<{ reply: string; provider: string; model: string; note: string | null }>("/tutor/chat", {
        messages: payload,
        context: { lessonTitle: tutorContext.lessonTitle, moduleTitle: tutorContext.moduleTitle, code: tutorContext.code?.slice(0, 12000), page: tutorContext.page },
      });
      setMessages((m) => [...m, { id: String(Date.now() + 1), role: "model", text: res.reply, timestamp: Date.now(), note: res.note, provider: res.provider }]);
    } catch (err) {
      setMessages((m) => [...m, { id: String(Date.now() + 1), role: "model", text: `Sorry - ${errorMessage(err, "I couldn't reach the tutor service.")}`, timestamp: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => setMessages([WELCOME]);
  const providerLabel = !settings?.tutor.configured
    ? "Curriculum mode (no AI key)"
    : settings.tutor.provider === "anthropic"
      ? "Powered by Claude"
      : settings.tutor.provider === "gemini"
        ? "Powered by Gemini"
        : "Curriculum mode";

  if (!tutorOpen) {
    return (
      <button
        onClick={() => {
          setTutorOpen(true);
          setMinimized(false);
        }}
        className="fixed bottom-5 right-5 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl shadow-blue-600/30 transition-all flex items-center gap-2 group no-print"
        aria-label="Open AI tutor"
      >
        <MessageSquare size={22} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-black text-xs uppercase tracking-widest whitespace-nowrap">Ask AI Tutor</span>
      </button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 w-72 card z-50 overflow-hidden shadow-2xl no-print">
        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center cursor-pointer text-white" onClick={() => setMinimized(false)}>
          <div className="flex items-center gap-2">
            <Bot size={18} />
            <span className="font-black text-sm">PyData Tutor</span>
          </div>
          <div className="flex items-center gap-2">
            <Maximize2 size={15} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTutorOpen(false);
              }}
              className="hover:text-blue-200"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 w-[calc(100vw-2rem)] sm:w-[420px] h-[min(600px,calc(100vh-6rem))] card z-50 flex flex-col overflow-hidden shadow-2xl animate-fade-in-up no-print">
      <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500 rounded-lg">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-black text-sm leading-tight">PyData Tutor</h3>
            <p className="text-[10px] text-blue-100 flex items-center gap-1.5 font-bold">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", settings?.tutor.configured ? "bg-green-400" : "bg-amber-300")} />
              {providerLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} className="p-1.5 hover:bg-blue-500 rounded-lg" title="Clear conversation" aria-label="Clear conversation">
            <Trash2 size={15} />
          </button>
          <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-blue-500 rounded-lg" aria-label="Minimize">
            <Minimize2 size={15} />
          </button>
          <button onClick={() => setTutorOpen(false)} className="p-1.5 hover:bg-blue-500 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {tutorContext.lessonTitle && (
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <Sparkles size={12} /> Context: {tutorContext.lessonTitle}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm", m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none")}>
              {m.role === "user" ? <p className="whitespace-pre-wrap">{m.text}</p> : <Markdown content={m.text} className="prose-sm prose-p:my-2 prose-pre:my-2 prose-ul:my-2" />}
              {m.note && <p className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">{m.note}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-500 font-bold">Thinking...</span>
            </div>
          </div>
        )}
        {messages.length <= 1 && !busy && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-left text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={user ? "Ask about your code..." : "Ask a question (log in for more)..."}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 dark:text-white"
            disabled={busy}
            maxLength={4000}
          />
          <button type="submit" disabled={!input.trim() || busy} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors" aria-label="Send">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
