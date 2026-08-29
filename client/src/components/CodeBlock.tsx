import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Play } from "lucide-react";
import { highlight } from "../lib/highlight";
import { copyToClipboard, cn } from "../lib/utils";
import { useSite } from "../context/SiteContext";

export function CodeBlock({ code, language = "python", filename = "example.py", className, tryIt = true }: { code: string; language?: string; filename?: string; className?: string; tryIt?: boolean }) {
  const navigate = useNavigate();
  const { settings } = useSite();
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code, language), [code, language]);
  const playgroundEnabled = settings?.features.playground !== false;

  const onCopy = async () => {
    if (await copyToClipboard(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={cn("relative rounded-2xl overflow-hidden bg-[#0f172a] border border-slate-700 shadow-lg group", className)}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#1e293b] border-b border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] truncate">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          {tryIt && playgroundEnabled && (
            <button
              onClick={() => navigate(`/playground?code=${encodeURIComponent(code)}`)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/10 hover:bg-blue-600/25 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              title="Run this in the interactive playground"
            >
              <Play size={12} /> Try it
            </button>
          )}
          <button onClick={onCopy} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded" title="Copy code" aria-label="Copy code">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar p-5 sm:p-6">
        <pre className="text-[13px] font-mono leading-relaxed text-slate-200">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  );
}
