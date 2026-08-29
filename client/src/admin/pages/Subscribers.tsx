import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Copy, Download, RefreshCw, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { Subscriber } from "../../lib/types";
import { cn, copyToClipboard, formatDate, formatDateTime, timeAgo } from "../../lib/utils";
import { usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Pill, Spinner } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreTable, CoreTd, CoreTh, CoreTr } from "../components/CoreTable";
import { CoreIconButton, CoreSearch, CoreSegmented } from "../components/CoreControls";

type Filter = "all" | "active" | "other";

export default function Subscribers() {
  usePageTitle("Admin subscribers");
  const toast = useToast();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<Subscriber | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ subscribers: Subscriber[] }>("/admin/subscribers");
      setSubs(data.subscribers);
    } catch (err) {
      setError(errorMessage(err, "Could not load subscribers"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = useMemo(() => subs.filter((s) => s.status === "active").length, [subs]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return subs.filter((s) => {
      if (filter === "active" && s.status !== "active") return false;
      if (filter === "other" && s.status === "active") return false;
      if (!needle) return true;
      return s.email.toLowerCase().includes(needle) || (s.status || "").toLowerCase().includes(needle);
    });
  }, [subs, q, filter]);

  const copyEmails = async () => {
    const list = visible.map((s) => s.email).join(", ");
    if (!list) return toast.info("Nothing to copy");
    const ok = await copyToClipboard(list);
    if (ok) toast.success("Emails copied", `${visible.length} address${visible.length === 1 ? "" : "es"} copied to the clipboard.`);
    else toast.error("Copy failed", "Your browser blocked clipboard access.");
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.del(`/admin/subscribers/${pending.id}`);
      setSubs((list) => list.filter((s) => s.id !== pending.id));
      toast.success("Subscriber removed", pending.email);
      setPending(null);
    } catch (err) {
      toast.error("Could not remove subscriber", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <CorePageHeader
        eyebrow="Inbox"
        title="Subscribers"
        subtitle={`${activeCount.toLocaleString()} active newsletter subscriber${activeCount === 1 ? "" : "s"}${subs.length !== activeCount ? ` (${subs.length} total)` : ""}.`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={copyEmails} disabled={visible.length === 0}>
              <Copy size={14} /> Copy emails
            </Button>
            <a href="/api/admin/subscribers.csv" target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-[10px]">
              <Download size={14} /> Export CSV
            </a>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <CoreSearch value={q} onChange={setQ} placeholder="Search by email" className="w-full md:max-w-sm" />
        <CoreSegmented<Filter>
          options={[
            { value: "all", label: "All", count: subs.length },
            { value: "active", label: "Active", count: activeCount },
            { value: "other", label: "Unsubscribed", count: subs.length - activeCount },
          ]}
          value={filter}
          onChange={setFilter}
        />
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
        <Spinner label="Loading subscribers" />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Bell size={26} />} title={subs.length === 0 ? "No subscribers yet" : "No subscribers match"} description={subs.length === 0 ? "Newsletter sign-ups from the footer form will appear here." : "Try a different search or filter."} />
        </div>
      ) : (
        <CoreTable footer={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Showing {visible.length} of {subs.length}</span>}>
          <thead>
            <tr>
              <CoreTh>Email</CoreTh>
              <CoreTh>Status</CoreTh>
              <CoreTh>Subscribed</CoreTh>
              <CoreTh className="text-right">Actions</CoreTh>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <CoreTr key={s.id}>
                <CoreTd>
                  <a href={`mailto:${s.email}`} className="font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                    {s.email}
                  </a>
                </CoreTd>
                <CoreTd>
                  <Pill color={s.status === "active" ? "emerald" : "slate"}>{s.status || "unknown"}</Pill>
                </CoreTd>
                <CoreTd className="whitespace-nowrap text-xs" title={formatDateTime(s.createdAt)}>
                  {formatDate(s.createdAt, { year: "numeric", month: "short", day: "numeric" })} <span className="text-slate-400">({timeAgo(s.createdAt)})</span>
                </CoreTd>
                <CoreTd>
                  <div className="flex justify-end">
                    <CoreIconButton title="Remove subscriber" tone="danger" onClick={() => setPending(s)} disabled={busy}>
                      <Trash2 size={16} />
                    </CoreIconButton>
                  </div>
                </CoreTd>
              </CoreTr>
            ))}
          </tbody>
        </CoreTable>
      )}

      <ConfirmDialog open={!!pending} onCancel={() => !busy && setPending(null)} onConfirm={remove} title="Remove subscriber?" message={pending ? `${pending.email} will no longer receive the newsletter.` : ""} confirmLabel="Remove" loading={busy} />
    </div>
  );
}
