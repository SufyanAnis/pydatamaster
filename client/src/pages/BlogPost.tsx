import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Clock, Eye, Share2 } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { api, ApiError, errorMessage } from "../lib/api";
import type { Post, PostSummary } from "../lib/types";
import { copyToClipboard, formatDate } from "../lib/utils";
import { Markdown } from "../lib/markdown";
import { useToast } from "../components/Toast";
import { AdSlot } from "../components/AdSlot";
import { Alert, Avatar, Button, EmptyState, LinkButton, Pill, Spinner } from "../components/ui";
import { BackLink, GlowPanel } from "../components/public";

interface PostResponse {
  post: Post;
  related: PostSummary[];
}

export default function BlogPost() {
  const { id } = useParams();
  const { siteName } = useSite();
  const toast = useToast();
  const [data, setData] = useState<PostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  usePageTitle(data?.post.title ?? "Blog");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .get<PostResponse>(`/content/posts/${encodeURIComponent(id ?? "")}`)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((err) => {
        if (alive) setError({ status: err instanceof ApiError ? err.status : 0, message: errorMessage(err) });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const share = async () => {
    const url = window.location.href;
    if (await copyToClipboard(url)) {
      setCopied(true);
      toast.success("Link copied", "Share this article with your team.");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Could not copy link", url);
    }
  };

  if (loading) return <Spinner label="Loading article" />;

  if (error?.status === 404 || (!data && !error)) {
    return (
      <EmptyState
        title="Post not found"
        description="This article may have been moved or unpublished."
        action={
          <LinkButton to="/blog" variant="dark">
            All articles
          </LinkButton>
        }
      />
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <BackLink to="/blog" className="mb-6">
          All articles
        </BackLink>
        <Alert type="error">{error?.message ?? "Something went wrong while loading this article."}</Alert>
      </div>
    );
  }

  const { post, related } = data;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      <BackLink to="/blog" className="mb-8">
        All articles
      </BackLink>

      <AdSlot slot="header" className="h-24 mb-8" />

      <article>
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
            <Pill color="blue">{post.category}</Pill>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <CalendarDays size={12} /> {formatDate(post.publishedAt)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Clock size={12} /> {post.readTime}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Eye size={12} /> {post.views.toLocaleString()} {post.views === 1 ? "view" : "views"}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.02] mb-6">{post.title}</h1>
          {post.excerpt && <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8">{post.excerpt}</p>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-y border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={post.author || "P"} color="indigo" size="md" />
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 dark:text-white truncate">{post.author}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">Curriculum Team @ {siteName}</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={share} className="shrink-0 no-print">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />} {copied ? "Copied" : "Share"}
            </Button>
          </div>
        </header>

        <Markdown content={post.content} className="prose-lg" />

        <AdSlot slot="content" className="h-48 mt-12" />
      </article>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <span className="eyebrow mb-2 block">Keep reading</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Related articles</h2>
            </div>
            <Link to="/blog" className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline shrink-0">
              All posts
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link key={r.id} to={`/blog/${r.id}`} className="card p-6 hover:shadow-xl transition-all group flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate">{r.category}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                    <Clock size={11} /> {r.readTime}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white leading-snug tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">{r.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 flex-1">{r.excerpt}</p>
                <span className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white flex items-center gap-2 group-hover:gap-3 transition-all">
                  Read <ArrowRight size={13} className="text-blue-600" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <GlowPanel tone="blue" className="p-8 md:p-12 mt-16 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 block mb-3">Practice makes permanent</span>
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-3">Enjoyed this tutorial?</h2>
        <p className="text-blue-100 font-medium max-w-xl mx-auto mb-8 leading-relaxed">Apply these concepts in our interactive course modules or try them in the playground.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/courses" className="btn bg-white text-blue-700 px-8 py-4 hover:bg-amber-400 hover:text-slate-900">
            Start learning <ArrowRight size={16} />
          </Link>
          <Link to="/playground" className="btn bg-blue-500/30 text-white border border-white/20 px-8 py-4 hover:bg-blue-500/50">
            Open playground
          </Link>
        </div>
      </GlowPanel>

      <AdSlot slot="content" className="h-40 mt-8" />
    </div>
  );
}
