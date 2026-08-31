import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Clock, Eye, FileQuestion, Share2, User } from "lucide-react";
import { api, ApiError, errorMessage } from "../lib/api";
import type { Post, PostSummary } from "../lib/types";
import { usePageTitle } from "../context/SiteContext";
import { useToast } from "../components/Toast";
import { copyToClipboard, formatDate } from "../lib/utils";
import { Markdown } from "../lib/markdown";
import { AdRailLayout, AdSlot } from "../components/AdSlot";
import { Alert, Button, EmptyState, LinkButton, Skeleton } from "../components/ui";
import { CategoryChip, PostCard } from "../components/blog/PostCard";

interface PostResponse {
  post: Post;
  related: PostSummary[];
  categoryName: string;
}

export default function PostPage() {
  const { id = "" } = useParams();
  const toast = useToast();

  const [data, setData] = useState<PostResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setNotFound(false);
    setError(null);
    window.scrollTo({ top: 0 });
    api
      .get<PostResponse>(`/content/posts/${encodeURIComponent(id)}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  usePageTitle(data?.post.title ?? null);

  const share = async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) toast.success("Link copied", "The article URL is on your clipboard.");
    else toast.error("Could not copy the link", "Please copy the address bar URL instead.");
  };

  if (notFound) {
    return (
      <EmptyState
        icon={<FileQuestion size={26} />}
        title="Article not found"
        description="This article does not exist, was unpublished, or the link is out of date."
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

  if (!data) {
    return (
      <AdRailLayout>
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </AdRailLayout>
    );
  }

  const { post, related, categoryName } = data;

  return (
    <AdRailLayout>
      <div className="animate-fade-in">
        <article className="max-w-3xl mx-auto">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            <Link to="/" className="hover:text-amber-600 transition-colors">
              Home
            </Link>
            <ChevronRight size={11} className="shrink-0" />
            <Link to={`/category/${post.category}`} className="hover:text-amber-600 transition-colors">
              {categoryName}
            </Link>
            <ChevronRight size={11} className="shrink-0" />
            <span className="text-slate-600 truncate max-w-[14rem] sm:max-w-xs">{post.title}</span>
          </nav>

          {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full rounded-2xl border border-slate-200 shadow-sm mb-8 object-cover" />}

          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.08]">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-[11px] font-bold text-slate-500">
              <CategoryChip slug={post.category} name={categoryName} />
              <span>{formatDate(post.publishedAt)}</span>
              {post.readTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {post.readTime}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Eye size={12} /> {post.views.toLocaleString()} views
              </span>
              {post.author && (
                <span className="inline-flex items-center gap-1">
                  <User size={12} /> {post.author}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={share} className="ml-auto -my-1">
                <Share2 size={13} /> Share
              </Button>
            </div>
            <div className="h-px bg-amber-400 mt-6" />
          </header>

          <Markdown content={post.content} className="prose-lg" />

          <AdSlot slot="content" className="my-10" />
        </article>

        {related.length > 0 && (
          <section aria-label="Related articles" className="mt-14">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Related articles</h2>
              <div className="h-px bg-amber-400 mt-3" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <PostCard key={p.id} post={p} categoryName={p.category === post.category ? categoryName : undefined} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AdRailLayout>
  );
}
