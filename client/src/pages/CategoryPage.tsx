import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Compass, Newspaper, Search } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { Category, PostSummary } from "../lib/types";
import { usePageTitle } from "../context/SiteContext";
import { pluralize } from "../lib/utils";
import { AdRailLayout } from "../components/AdSlot";
import { Alert, EmptyState, Input, LinkButton, Skeleton } from "../components/ui";
import { PostCard, PostCardSkeleton } from "../components/blog/PostCard";

export default function CategoryPage() {
  const { slug = "" } = useParams();

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    setCategories(null);
    setError(null);
    setFilter("");
    Promise.all([
      api.get<{ categories: Category[] }>("/content/categories"),
      api.get<{ posts: PostSummary[] }>(`/content/posts?category=${encodeURIComponent(slug)}&limit=100`),
    ])
      .then(([c, p]) => {
        if (cancelled) return;
        setCategories(c.categories);
        setPosts(p.posts);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const category = categories?.find((c) => c.slug === slug);
  usePageTitle(category?.name ?? null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return posts ?? [];
    return (posts ?? []).filter((p) => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
  }, [posts, filter]);

  const loading = (posts === null || categories === null) && !error;

  return (
    <AdRailLayout>
      <div className="animate-fade-in">
        {error && <Alert type="error">{error}</Alert>}

        {loading && (
          <div>
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-4 w-96 max-w-full mb-10" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && !category && (
          <EmptyState
            icon={<Compass size={26} />}
            title="Topic not found"
            description="This topic does not exist or is no longer available."
            action={<LinkButton to="/" variant="dark">Back to home</LinkButton>}
          />
        )}

        {!loading && !error && category && (
          <>
            <header className="mb-10">
              <span className="eyebrow block mb-3">Topic</span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.05]">{category.name}</h1>
              {category.description && <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed mt-4 max-w-2xl">{category.description}</p>}
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 mt-4">{pluralize(posts?.length ?? 0, "article")}</p>
              <div className="h-px bg-amber-400 mt-5" />
            </header>

            {(posts?.length ?? 0) === 0 ? (
              <EmptyState icon={<Newspaper size={26} />} title="No articles here yet" description="Nothing has been published under this topic so far. Check back soon." />
            ) : (
              <>
                <div className="relative max-w-sm mb-8">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter articles..." className="pl-10" aria-label="Filter articles" />
                </div>

                {filtered.length === 0 ? (
                  <EmptyState icon={<Search size={26} />} title="No matches" description={`No articles match "${filter.trim()}". Try a different keyword.`} />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((p) => (
                      <PostCard key={p.id} post={p} categoryName={category.name} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdRailLayout>
  );
}
