import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Newspaper, Search } from "lucide-react";
import { api } from "../lib/api";
import type { Category, PostSummary } from "../lib/types";
import { usePageTitle, useSite } from "../context/SiteContext";
import { AdSlot } from "../components/AdSlot";
import { EmptyState, Skeleton } from "../components/ui";
import { FeaturedPostCard, PostCard, PostCardSkeleton } from "../components/blog/PostCard";

function SectionHead({ title, description, to }: { title: string; description?: string; to?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{title}</h2>
        {to && (
          <Link to={to} className="shrink-0 inline-flex items-center gap-1.5 pb-1 text-[11px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors">
            View all <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {description && <p className="text-sm text-slate-500 font-medium mt-1.5 max-w-2xl">{description}</p>}
      <div className="h-px bg-amber-400 mt-3" />
    </div>
  );
}

export default function Home() {
  usePageTitle(null);
  const { settings, setSearchOpen } = useSite();

  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get<{ posts: PostSummary[] }>("/content/posts?limit=100"), api.get<{ categories: Category[] }>("/content/categories")])
      .then(([p, c]) => {
        if (cancelled) return;
        setPosts(p.posts);
        setCategories(c.categories);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const catInfo = useMemo(() => {
    const map = new Map<string, { name: string; description?: string }>();
    for (const c of categories) map.set(c.slug, { name: c.name, description: c.description });
    for (const n of settings?.nav ?? []) if (!map.has(n.slug)) map.set(n.slug, { name: n.name });
    return map;
  }, [categories, settings?.nav]);
  const catName = (slug: string) => catInfo.get(slug)?.name;

  const byCategory = useMemo(() => {
    const map = new Map<string, PostSummary[]>();
    for (const p of posts ?? []) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [posts]);

  const loading = posts === null;
  const featured = posts?.[0];
  const latest = posts?.slice(1, 7) ?? [];
  const hero = settings?.hero;

  return (
    <div className="space-y-14 animate-fade-in">
      {/* Hero band */}
      <section className="bg-amber-50 rounded-3xl px-6 py-12 md:px-14 md:py-16 text-center">
        {hero?.badge && <span className="eyebrow block mb-4">{hero.badge}</span>}
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[1.08] max-w-3xl mx-auto">
          {hero?.titleLine1 ?? "Practical guides for"}{" "}
          <span className="underline decoration-amber-400 decoration-[6px] underline-offset-[6px]">{hero?.titleLine2 ?? "Python data work"}</span>
        </h1>
        {hero?.subtitle && <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mt-6">{hero.subtitle}</p>}
        <button
          onClick={() => setSearchOpen(true)}
          className="mt-8 w-full max-w-xl mx-auto flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left hover:border-amber-400 hover:shadow-md transition-all"
          aria-label="Search the site"
        >
          <Search size={18} className="text-amber-500 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-400 truncate">Search articles, topics and pages...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5 bg-slate-50">Ctrl K</kbd>
        </button>
      </section>

      {loading && (
        <>
          <section>
            <div className="card overflow-hidden grid lg:grid-cols-2">
              <div className="skeleton aspect-video lg:aspect-auto lg:h-full w-full rounded-none" />
              <div className="p-6 md:p-10 space-y-4">
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </section>
          <section>
            <SectionHead title="Latest articles" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </>
      )}

      {posts !== null && posts.length === 0 && (
        <EmptyState icon={<Newspaper size={26} />} title="No articles yet" description="Nothing has been published so far. Check back soon for new content." />
      )}

      {featured && (
        <section aria-label="Featured article">
          <FeaturedPostCard post={featured} categoryName={catName(featured.category)} />
        </section>
      )}

      {latest.length > 0 && (
        <section aria-label="Latest articles">
          <SectionHead title="Latest articles" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.map((p) => (
              <PostCard key={p.id} post={p} categoryName={catName(p.category)} />
            ))}
          </div>
        </section>
      )}

      {posts !== null && posts.length > 0 && <AdSlot slot="content" />}

      {(settings?.nav ?? []).map((nav) => {
        const catPosts = byCategory.get(nav.slug)?.slice(0, 3) ?? [];
        if (catPosts.length === 0) return null;
        return (
          <section key={nav.slug} aria-label={nav.name}>
            <SectionHead title={nav.name} description={catInfo.get(nav.slug)?.description} to={`/category/${nav.slug}`} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {catPosts.map((p) => (
                <PostCard key={p.id} post={p} categoryName={nav.name} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
