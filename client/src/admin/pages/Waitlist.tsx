import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, ExternalLink, ListChecks, Phone, RefreshCw, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { WaitlistEntry } from "../../lib/types";
import { cn, copyToClipboard, formatDateTime, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Spinner } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreTable, CoreTd, CoreTh, CoreTr } from "../components/CoreTable";
import { CoreIconButton, CoreSearch } from "../components/CoreControls";
import { SourcePill } from "../components/CoreStatus";

function externalHref(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
}

export default function Waitlist() {
  usePageTitle("Admin waitlist");
  const toast = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<WaitlistEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ entries: WaitlistEntry[] }>("/admin/waitlist");
      setEntries(data.entries);
    } catch (err) {
      setError(errorMessage(err, "Could not load the waitlist"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => [e.email, e.socialLink, e.phone, e.source].some((v) => (v || "").toLowerCase().includes(needle)));
  }, [entries, q]);

  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.source || "unknown", (map.get(e.source || "unknown") ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const copyEmails = async () => {
    const list = visible.map((e) => e.email).join(", ");
    if (!list) return toast.info("Nothing to copy");
    const ok = await copyToClipboard(list);
    if (ok) toast.success("Emails copied", `${visible.length} address${visible.length === 1 ? "" : "es"} copied to the clipboard.`);
    else toast.error("Copy failed", "Your browser blocked clipboard access.");
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.del(`/admin/waitlist/${pending.id}`);
      setEntries((list) => list.filter((e) => e.id !== pending.id));
      toast.success("Entry removed", pending.email);
      setPending(null);
    } catch (err) {
      toast.error("Could not remove entry", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <CorePageHeader
        eyebrow="Inbox"
        title="Waitlist"
        subtitle={`${entries.length.toLocaleString()} ${entries.length === 1 ? "person is" : "people are"} waiting for Pro access.`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={copyEmails} disabled={visible.length === 0}>
              <Copy size={14} /> Copy emails
            </Button>
            <a href="/api/admin/waitlist.csv" target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-[10px]">
              <Download size={14} /> Export CSV
            </a>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <CoreSearch value={q} onChange={setQ} placeholder="Search email, phone, source" className="w-full md:max-w-sm" />
        {sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            {sources.map(([source, count]) => (
              <button key={source} type="button" onClick={() => setQ(q === source ? "" : source)} className="flex items-center gap-1.5 group" title={`Filter by ${source}`}>
                <SourcePill source={source} />
                <span className="text-[10px] font-black text-slate-400 tabular-nums group-hover:text-blue-600">{count}</span>
              </button>
            ))}
          </div>
        )}
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
        <Spinner label="Loading waitlist" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ListChecks size={26} />} title={entries.length === 0 ? "Waitlist is empty" : "No entries match"} description={entries.length === 0 ? "Sign-ups from the pricing and notify pages will appear here." : "Try a different search."} />
        </div>
      ) : (
        <CoreTable footer={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Showing {visible.length} of {entries.length}</span>}>
          <thead>
            <tr>
              <CoreTh>Email</CoreTh>
              <CoreTh>Social</CoreTh>
              <CoreTh>Phone</CoreTh>
              <CoreTh>Source</CoreTh>
              <CoreTh>Joined</CoreTh>
              <CoreTh className="text-right">Actions</CoreTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <CoreTr key={e.id}>
                <CoreTd>
                  <a href={`mailto:${e.email}`} className="font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                    {e.email}
                  </a>
                </CoreTd>
                <CoreTd>
                  {e.socialLink ? (
                    <a href={externalHref(e.socialLink)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline max-w-[240px] truncate">
                      <ExternalLink size={12} className="shrink-0" />
                      <span className="truncate">{e.socialLink}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </CoreTd>
                <CoreTd className="whitespace-nowrap">
                  {e.phone ? (
                    <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1.5 text-xs hover:text-blue-600">
                      <Phone size={12} className="text-slate-400" /> {e.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </CoreTd>
                <CoreTd>
                  <SourcePill source={e.source} />
                </CoreTd>
                <CoreTd className="whitespace-nowrap text-xs" title={formatDateTime(e.createdAt)}>
                  {timeAgo(e.createdAt)}
                </CoreTd>
                <CoreTd>
                  <div className="flex justify-end">
                    <CoreIconButton title="Remove entry" tone="danger" onClick={() => setPending(e)} disabled={busy}>
                      <Trash2 size={16} />
                    </CoreIconButton>
                  </div>
                </CoreTd>
              </CoreTr>
            ))}
          </tbody>
        </CoreTable>
      )}

      <ConfirmDialog open={!!pending} onCancel={() => !busy && setPending(null)} onConfirm={remove} title="Remove from waitlist?" message={pending ? `${pending.email} will be removed from the waitlist.` : ""} confirmLabel="Remove" loading={busy} />
    </div>
  );
}
