import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, CheckCheck, ExternalLink, GraduationCap, Inbox as InboxIcon, Mail, MailOpen, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import type { ContactMessage } from "../../lib/types";
import { cn, formatDateTime, timeAgo } from "../../lib/utils";
import { useSite, usePageTitle } from "../../context/SiteContext";
import { useToast } from "../../components/Toast";
import { Alert, Button, ConfirmDialog, EmptyState, Modal, Spinner, Textarea } from "../../components/ui";
import { CorePageHeader } from "../components/CorePageHeader";
import { CoreSearch, CoreSegmented } from "../components/CoreControls";
import { MessageStatusPill } from "../components/CoreStatus";

type Status = ContactMessage["status"];
type Filter = "all" | Status;
const FILTERS: Filter[] = ["all", "new", "read", "replied", "archived"];

function useIsLarge(): boolean {
  const [large, setLarge] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setLarge(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return large;
}

function externalHref(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return `mailto:${v}`;
  return `https://${v.replace(/^\/+/, "")}`;
}

export default function Inbox() {
  usePageTitle("Admin inbox");
  const toast = useToast();
  const { siteName } = useSite();
  const isLarge = useIsLarge();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ messages: ContactMessage[] }>("/admin/messages");
      setMessages(data.messages);
    } catch (err) {
      setError(errorMessage(err, "Could not load messages"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: messages.length, new: 0, read: 0, replied: 0, archived: 0 };
    for (const m of messages) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [messages]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!needle) return true;
      return [m.firstName, m.lastName, m.email, m.message, m.profession, m.education].some((v) => (v || "").toLowerCase().includes(needle));
    });
  }, [messages, filter, q]);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) ?? null, [messages, selectedId]);

  const patch = useCallback(
    async (id: number, body: { status?: Status; adminNote?: string }, success?: string) => {
      setBusy(true);
      try {
        await api.patch(`/admin/messages/${id}`, body);
        setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(body.status ? { status: body.status } : {}), ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}) } : m)));
        if (success) toast.success(success);
        return true;
      } catch (err) {
        toast.error("Update failed", errorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const open = (m: ContactMessage) => {
    setSelectedId(m.id);
    if (m.status === "new") {
      // Mark as read silently; update optimistically.
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, status: "read" } : x)));
      api.patch(`/admin/messages/${m.id}`, { status: "read" }).catch(() => {
        setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, status: "new" } : x)));
      });
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await api.del(`/admin/messages/${confirmDelete.id}`);
      setMessages((list) => list.filter((m) => m.id !== confirmDelete.id));
      if (selectedId === confirmDelete.id) setSelectedId(null);
      toast.success("Message deleted");
      setConfirmDelete(null);
    } catch (err) {
      toast.error("Could not delete", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const detail = selected && <MessageDetail key={selected.id} message={selected} siteName={siteName} busy={busy} onPatch={(body, success) => patch(selected.id, body, success)} onDelete={() => setConfirmDelete(selected)} />;

  return (
    <div>
      <CorePageHeader
        eyebrow="Inbox"
        title="Messages"
        subtitle={counts.new > 0 ? `${counts.new} new message${counts.new === 1 ? "" : "s"} waiting for a reply.` : "Contact form submissions from visitors."}
        actions={
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <CoreSegmented options={FILTERS.map((f) => ({ value: f, label: f === "all" ? "All" : f, count: counts[f] }))} value={filter} onChange={setFilter} />
        <CoreSearch value={q} onChange={setQ} placeholder="Search messages" className="w-full md:max-w-xs md:ml-auto" />
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
        <Spinner label="Loading messages" />
      ) : (
        <div className={cn("grid gap-6 items-start", isLarge && selected && "lg:grid-cols-5")}>
          <div className={cn("card overflow-hidden", isLarge && selected && "lg:col-span-3")}>
            {visible.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={26} />}
                title={messages.length === 0 ? "Inbox is empty" : "No messages match"}
                description={messages.length === 0 ? "Submissions from the contact form will show up here." : "Try another filter or search term."}
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((m) => {
                  const active = m.id === selectedId;
                  const unread = m.status === "new";
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => open(m)}
                        className={cn("w-full text-left px-4 sm:px-5 py-4 flex gap-4 transition-colors", active ? "bg-blue-50/70 dark:bg-blue-900/15" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", unread ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                          {unread ? <Mail size={17} /> : <MailOpen size={17} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-sm truncate", unread ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-800 dark:text-slate-200")}>
                              {m.firstName} {m.lastName}
                            </span>
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">{m.email}</span>
                            <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap" title={formatDateTime(m.createdAt)}>
                              {timeAgo(m.createdAt)}
                            </span>
                          </div>
                          <p className={cn("text-xs mt-1 line-clamp-2", unread ? "text-slate-700 dark:text-slate-300 font-semibold" : "text-slate-500 dark:text-slate-400 font-medium")}>{m.message}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <MessageStatusPill status={m.status} />
                            {m.profession && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 truncate">
                                <Briefcase size={11} /> {m.profession}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isLarge && selected && <div className="lg:col-span-2 lg:sticky lg:top-24">{detail}</div>}
        </div>
      )}

      {!isLarge && (
        <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : "Message"} size="md">
          {detail}
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onCancel={() => !busy && setConfirmDelete(null)}
        onConfirm={remove}
        title="Delete message?"
        message={confirmDelete ? `The message from ${confirmDelete.firstName} ${confirmDelete.lastName} will be permanently removed.` : ""}
        confirmLabel="Delete"
        loading={busy}
      />
    </div>
  );
}

/* ------------------------------------------------------------- Detail panel */
function MessageDetail({ message: m, siteName, busy, onPatch, onDelete }: { message: ContactMessage; siteName: string; busy: boolean; onPatch: (body: { status?: Status; adminNote?: string }, success?: string) => Promise<boolean>; onDelete: () => void }) {
  const [note, setNote] = useState(m.adminNote ?? "");
  const dirty = note !== (m.adminNote ?? "");
  const mailto = `mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to ${siteName}`)}`;
  const social = externalHref(m.social || "");

  const statusButton = (label: string, status: Status, icon: JSX.Element, variant: "primary" | "secondary" | "dark" = "secondary") => (
    <Button key={status} size="sm" variant={variant} onClick={() => onPatch({ status }, `Marked as ${status}`)} disabled={busy || m.status === status}>
      {icon} {label}
    </Button>
  );

  return (
    <div className="card p-5 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
            {m.firstName} {m.lastName}
          </h2>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{formatDateTime(m.createdAt)}</div>
        </div>
        <MessageStatusPill status={m.status} />
      </div>

      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2 text-sm">
        <a href={mailto} className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 hover:underline break-all">
          <Mail size={14} className="shrink-0" /> {m.email}
        </a>
        {m.profession && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <Briefcase size={14} className="shrink-0 text-slate-400" /> {m.profession}
          </div>
        )}
        {m.education && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <GraduationCap size={14} className="shrink-0 text-slate-400" /> {m.education}
          </div>
        )}
        {social && (
          <a href={social} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 break-all">
            <ExternalLink size={14} className="shrink-0 text-slate-400" /> {m.social}
          </a>
        )}
      </div>

      <div>
        <div className="label mb-2">Message</div>
        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap break-words">{m.message}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={mailto} className="btn-primary px-4 py-2 text-[10px]">
          <Mail size={14} /> Reply by email
        </a>
        {m.status !== "read" && statusButton("Mark read", "read", <MailOpen size={14} />)}
        {statusButton("Replied", "replied", <CheckCheck size={14} />)}
        {m.status !== "archived" ? statusButton("Archive", "archived", <Archive size={14} />) : statusButton("Reopen", "new", <RotateCcw size={14} />)}
      </div>

      <div>
        <div className="label mb-2">Admin note</div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private notes about this conversation (only admins can see this)." maxLength={2000} className="min-h-[96px]" />
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{note.length}/2000</span>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={onDelete} disabled={busy}>
              <Trash2 size={14} /> Delete
            </Button>
            <Button size="sm" onClick={() => onPatch({ adminNote: note }, "Note saved")} disabled={!dirty || busy}>
              <Save size={14} /> Save note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
