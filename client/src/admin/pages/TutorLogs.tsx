import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Bot, ChevronDown, ChevronRight, Cpu, MessageSquare, RefreshCw, Trash2, User as UserIcon } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { TutorLog } from "../../lib/types";
import { cn, formatDateTime, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Markdown } from "../../lib/markdown";
import { Alert, Button, ConfirmDialog, EmptyState, Spinner, StatTile } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreTable, CoreTd, CoreTh, CoreTr } from "../components/CoreTable";
import { CoreSearch, CoreSegmented } from "../components/CoreControls";
import { ProviderPill } from "../components/CoreStatus";

function excerpt(text: string, max = 110): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}...` : clean;
}

export default function TutorLogs() {
  usePageTitle("Admin AI tutor logs");
  const toast = useToast();
  const [logs, setLogs] = useState<TutorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ logs: TutorLog[] }>("/admin/tutor/logs");
      setLogs(data.logs);
    } catch (err) {
      setError(errorMessage(err, "Could not load tutor logs"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const byProvider = new Map<string, number>();
    let tokensIn = 0;
    let tokensOut = 0;
    const users = new Set<string>();
    for (const l of logs) {
      const p = l.provider || "unknown";
      byProvider.set(p, (byProvider.get(p) ?? 0) + 1);
      tokensIn += l.tokensIn || 0;
      tokensOut += l.tokensOut || 0;
      if (l.user) users.add(l.user.email);
    }
    return { total: logs.length, byProvider: Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1]), tokensIn, tokensOut, users: users.size };
  }, [logs]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (provider !== "all" && (l.provider || "unknown") !== provider) return false;
      if (!needle) return true;
      return [l.question, l.answer, l.model, l.user?.name, l.user?.email].some((v) => (v || "").toLowerCase().includes(needle));
    });
  }, [logs, q, provider]);

  const clear = async () => {
    setClearing(true);
    try {
      await api.del("/admin/tutor/logs");
      setLogs([]);
      setExpanded(null);
      setConfirmClear(false);
      toast.success("Tutor logs cleared");
    } catch (err) {
      toast.error("Could not clear logs", errorMessage(err));
    } finally {
      setClearing(false);
    }
  };

  const providerOptions = [{ value: "all", label: "All", count: logs.length }, ...stats.byProvider.map(([p, count]) => ({ value: p, label: p, count }))];

  return (
    <div>
      <CorePageHeader
        eyebrow="System"
        title="AI Tutor logs"
        subtitle="The 200 most recent tutor conversations, with provider and token usage."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)} disabled={logs.length === 0 || loading}>
              <Trash2 size={14} /> Clear logs
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatTile label="Total chats" value={stats.total.toLocaleString()} icon={<MessageSquare size={20} />} color="blue" sub={`${stats.users} signed-in learner${stats.users === 1 ? "" : "s"}`} />
        <StatTile label="By provider" value={stats.byProvider.length === 0 ? "-" : stats.byProvider.map(([p, c]) => `${p} ${c}`).join(" / ")} icon={<Bot size={20} />} color="indigo" sub="Chats per provider" />
        <StatTile label="Tokens in" value={stats.tokensIn.toLocaleString()} icon={<Cpu size={20} />} color="emerald" sub="Prompt tokens" />
        <StatTile label="Tokens out" value={stats.tokensOut.toLocaleString()} icon={<Cpu size={20} />} color="amber" sub={`${(stats.tokensIn + stats.tokensOut).toLocaleString()} total`} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <CoreSearch value={q} onChange={setQ} placeholder="Search questions, answers, users" className="w-full md:max-w-sm" />
        {providerOptions.length > 1 && <CoreSegmented options={providerOptions} value={provider} onChange={setProvider} />}
      </div>

      {error && (
        <Alert type="error" className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={load}>
            Try again
          </Button>
        </Alert>
      )}

      {loading ? (
        <Spinner label="Loading logs" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Bot size={26} />} title={logs.length === 0 ? "No tutor conversations yet" : "No logs match"} description={logs.length === 0 ? "Conversations with the AI tutor are recorded here once learners start asking questions." : "Try another search or provider filter."} />
        </div>
      ) : (
        <CoreTable footer={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Showing {visible.length} of {logs.length}. Click a row to read the full exchange.</span>}>
          <thead>
            <tr>
              <CoreTh className="w-8" />
              <CoreTh>Time</CoreTh>
              <CoreTh>User</CoreTh>
              <CoreTh>Provider</CoreTh>
              <CoreTh>Model</CoreTh>
              <CoreTh className="text-right">Tokens in / out</CoreTh>
              <CoreTh>Question</CoreTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const open = expanded === l.id;
              return (
                <Fragment key={l.id}>
                  <CoreTr onClick={() => setExpanded(open ? null : l.id)} className={cn("cursor-pointer", open && "bg-blue-50/60 dark:bg-blue-900/10")} aria-expanded={open}>
                    <CoreTd className="text-slate-400 pr-0">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</CoreTd>
                    <CoreTd className="whitespace-nowrap text-xs" title={formatDateTime(l.createdAt)}>
                      {timeAgo(l.createdAt)}
                    </CoreTd>
                    <CoreTd>
                      {l.user ? (
                        <div className="min-w-[140px]">
                          <div className="text-xs font-black text-slate-900 dark:text-white truncate">{l.user.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{l.user.email}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                          <UserIcon size={12} /> Anonymous
                        </span>
                      )}
                    </CoreTd>
                    <CoreTd>
                      <ProviderPill provider={l.provider} />
                    </CoreTd>
                    <CoreTd className="font-mono text-xs whitespace-nowrap">{l.model || "-"}</CoreTd>
                    <CoreTd className="text-right tabular-nums text-xs whitespace-nowrap">
                      {l.tokensIn.toLocaleString()} <span className="text-slate-400">/</span> {l.tokensOut.toLocaleString()}
                    </CoreTd>
                    <CoreTd className="min-w-[260px] max-w-[420px]">
                      <span className="block truncate text-xs" title={l.question}>
                        {excerpt(l.question)}
                      </span>
                    </CoreTd>
                  </CoreTr>
                  {open && (
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                      <td colSpan={7} className="px-4 sm:px-6 py-5">
                        <div className="grid lg:grid-cols-2 gap-5">
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center">
                                <UserIcon size={14} />
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</span>
                              {l.user && <span className="ml-auto text-[10px] font-bold text-slate-500 truncate">{l.user.name}</span>}
                            </div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap break-words leading-relaxed">{l.question}</p>
                          </div>
                          <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center">
                                <Bot size={14} />
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer</span>
                              <span className="ml-auto text-[10px] font-mono text-slate-400 truncate">
                                {l.provider}
                                {l.model ? ` / ${l.model}` : ""}
                              </span>
                            </div>
                            {l.answer ? <Markdown content={l.answer} className="prose-sm" /> : <p className="text-sm text-slate-400 italic">No answer recorded.</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </CoreTable>
      )}

      <ConfirmDialog open={confirmClear} onCancel={() => !clearing && setConfirmClear(false)} onConfirm={clear} title="Clear all tutor logs?" message={`This permanently deletes ${logs.length.toLocaleString()} logged conversation${logs.length === 1 ? "" : "s"}. Usage statistics on the dashboard will reset.`} confirmLabel="Clear logs" loading={clearing} />
    </div>
  );
}
