import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { api, ApiError, errorMessage } from "../lib/api";
import type { Page } from "../lib/types";
import { usePageTitle } from "../context/SiteContext";
import { formatDate } from "../lib/utils";
import { Markdown } from "../lib/markdown";
import { Alert, EmptyState, LinkButton, Skeleton } from "../components/ui";

export default function StaticPage() {
  const { slug = "" } = useParams();

  const [page, setPage] = useState<Page | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    setNotFound(false);
    setError(null);
    api
      .get<{ page: Page }>(`/content/pages/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!cancelled) setPage(d.page);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageTitle(page?.title ?? null);

  if (notFound) {
    return (
      <EmptyState
        icon={<FileQuestion size={26} />}
        title="Page not found"
        description="This page does not exist or is no longer available."
        action={<LinkButton to="/" variant="dark">Back to home</LinkButton>}
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-px w-full" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.05]">{page.title}</h1>
      <div className="h-px bg-amber-400 mt-6 mb-8" />
      <Markdown content={page.content} className="prose-lg" />
      <p className="mt-12 pt-6 border-t border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400">Last updated {formatDate(page.updatedAt)}</p>
    </div>
  );
}
