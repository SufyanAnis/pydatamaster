import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Printer } from "lucide-react";
import { usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import type { Resource } from "../lib/types";
import { Icon } from "../lib/icons";
import { copyToClipboard } from "../lib/utils";
import { Markdown } from "../lib/markdown";
import { useToast } from "../components/Toast";
import { AdSlot } from "../components/AdSlot";
import { Alert, Button, EmptyState, LinkButton, Spinner } from "../components/ui";
import { BackLink } from "../components/public";

export default function CheatSheet() {
  const { id } = useParams();
  const toast = useToast();
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const numericId = Number(id);
  const sheet = resources?.find((r) => r.id === numericId && r.category === "cheatsheet") ?? null;
  const others = (resources ?? []).filter((r) => r.category === "cheatsheet" && r.id !== numericId);
  usePageTitle(sheet ? sheet.name : "Cheat Sheet");

  useEffect(() => {
    let alive = true;
    api
      .get<{ resources: Resource[] }>("/content/resources")
      .then((d) => {
        if (alive) setResources(d.resources);
      })
      .catch((err) => {
        if (alive) {
          setError(errorMessage(err));
          setResources([]);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const copyMarkdown = async () => {
    if (!sheet) return;
    if (await copyToClipboard(sheet.content)) {
      setCopied(true);
      toast.success("Markdown copied", "Paste it into your notes or README.");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Could not copy", "Your browser blocked clipboard access.");
    }
  };

  if (resources === null) return <Spinner label="Loading cheat sheet" />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <BackLink to="/resources" className="mb-6">
          All resources
        </BackLink>
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  if (!sheet) {
    return (
      <EmptyState
        title="Cheat sheet not found"
        description="This reference may have been moved or removed."
        action={
          <LinkButton to="/resources" variant="dark">
            Browse resources
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      <BackLink to="/resources" className="mb-8">
        All resources
      </BackLink>

      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex items-start gap-5 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <Icon name={sheet.icon} size={30} />
          </div>
          <div className="min-w-0">
            <span className="eyebrow mb-2 block">Cheat sheet</span>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.05] mb-3">{sheet.name}</h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{sheet.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0 no-print">
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> Print / Save as PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={copyMarkdown}>
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? "Copied" : "Copy markdown"}
          </Button>
        </div>
      </header>

      <div className="card p-6 sm:p-8 md:p-10 print:border-0 print:shadow-none print:p-0">
        {sheet.content.trim() ? (
          <div className="overflow-x-auto custom-scrollbar">
            <Markdown content={sheet.content} className="[&_table]:min-w-[560px] [&_table]:w-full" />
          </div>
        ) : (
          <EmptyState title="Content coming soon" description="This cheat sheet is still being written." />
        )}
      </div>

      {others.length > 0 && (
        <section className="mt-10 no-print">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Other cheat sheets</div>
          <div className="flex flex-wrap gap-2">
            {others.map((r) => (
              <Link key={r.id} to={`/resources/cheatsheet/${r.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                <Icon name={r.icon} size={14} className="text-amber-500" /> {r.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="no-print">
        <AdSlot slot="content" className="h-40 mt-10" />
      </div>
    </div>
  );
}
