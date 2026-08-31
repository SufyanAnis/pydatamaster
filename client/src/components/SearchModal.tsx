import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileText, FolderOpen, Info, Loader2, Search, X } from "lucide-react";
import { api } from "../lib/api";
import type { SearchHit } from "../lib/types";
import { useSite } from "../context/SiteContext";
import { cn } from "../lib/utils";

const ICONS = { post: FileText, page: Info, category: FolderOpen };

export function SearchModal() {
  const { searchOpen, setSearchOpen } = useSite();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setHits([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      api
        .get<{ hits: SearchHit[] }>(`/content/search?q=${encodeURIComponent(q.trim())}`)
        .then((d) => {
          setHits(d.hits);
          setActive(0);
        })
        .catch(() => setHits([]))
        .finally(() => setBusy(false));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const open = (hit: SearchHit) => {
    setSearchOpen(false);
    if (/^https?:\/\//.test(hit.href)) window.open(hit.href, "_blank", "noopener");
    else navigate(hit.href);
  };

  if (!searchOpen) return null;
  return (
    <div className="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-md flex items-start justify-center p-4 pt-[10vh] animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && setSearchOpen(false)}>
      <div className="w-full max-w-2xl card shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          {busy ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Search size={18} className="text-slate-400" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && hits[active]) open(hits[active]);
            }}
            placeholder="Search lessons, articles, pipeline steps, resources..."
            className="flex-1 bg-transparent outline-none text-sm font-medium dark:text-white placeholder:text-slate-400"
          />
          <button onClick={() => setSearchOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {q.trim() && !busy && hits.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500 font-medium">No results for "{q}".</p>}
          {!q.trim() && <p className="px-5 py-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Type to search the whole platform</p>}
          {hits.map((hit, i) => {
            const Ico = ICONS[hit.type];
            const external = /^https?:\/\//.test(hit.href);
            return (
              <button key={`${hit.type}-${hit.id}`} onMouseEnter={() => setActive(i)} onClick={() => open(hit)} className={cn("w-full flex items-center gap-4 px-5 py-3 text-left transition-colors", i === active ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60")}>
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Ico size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900 dark:text-white truncate">{hit.title}</span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{hit.subtitle}</span>
                </span>
                {external && <ExternalLink size={14} className="text-slate-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
