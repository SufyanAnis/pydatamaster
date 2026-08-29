import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, PenLine, Search, X } from "lucide-react";
import { useSite, usePageTitle } from "../context/SiteContext";
import { api, errorMessage } from "../lib/api";
import type { PostSummary } from "../lib/types";
import { cn, formatDate } from "../lib/utils";
import { AdSlot } from "../components/AdSlot";
import { Alert, EmptyState, LinkButton, PageHero, Pill, Skeleton } from "../components/ui";
import { GlowPanel } from "../components/public";

function PostCard({ post, index }: { post: PostSummary; index: number }) {
  const href = `/blog/${post.id}`;
  return (
    <article className="card p-6 md:p-7 hover:shadow-xl transition-all group flex flex-col animate-fade-in-up" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <Pill color="blue">{post.category}</Pill>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
          <Clock size={11} /> {post.readTime}
        </span>
      </div>
      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        <Link to={href}>{post.title}</Link>
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3 mb-6 flex-1">{post.excerpt}</p>
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{post.author}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{formatDate(post.publishedAt)}</div>
        </div>
        <Link to={href} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all shrink-0">
          Read full post <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

export default function Blog() {
  usePageTitle("Blog");
  const { settings } = useSite();
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let alive = true;
    api
      .get<{ posts: PostSummary[]; categories: string[] }>("/content/posts")
      .then((d) => {
        if (!alive) return;
        setPosts(d.posts);
        setCategories(d.categories);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return posts.filter((p) => (category === "All" || p.category === category) && (!s || p.title.toLowerCase().includes(s) || p.excerpt.toLowerCase().includes(s)));
  }, [posts, q, category]);

  if (settings && settings.features.blog === false) {
    return (
      <EmptyState
        title="Blog is currently disabled"
        description="Articles are taking a short break. In the meantime, the full curriculum and playground are open."
        action={
          <LinkButton to="/courses" variant="dark">
            Browse courses
          </LinkButton>
        }
      />
    );
  }

  const pills = ["All", ...categories];

  return (
    <div className="pb-10">
      <PageHero eyebrow="Insights & Expertise" title="Data Science Blog" subtitle="Daily tips, industry tutorials, and library updates to keep your technical skills sharp." />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
        <div className="flex flex-wrap gap-2">
          {pills.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                category === c ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles..." className="input pl-11 pr-10" aria-label="Search articles" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <Alert type="error" className="mb-8">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title={posts.length === 0 ? "No articles yet" : "No matching articles"}
            description={posts.length === 0 ? "Fresh tutorials are on the way. Check back soon." : "Try a different keyword or category."}
            icon={<Search size={26} />}
            action={
              posts.length > 0 ? (
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("All");
                  }}
                  className="btn-secondary px-5 py-2.5"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            {filtered.length} {filtered.length === 1 ? "article" : "articles"}
            {category !== "All" && ` in ${category}`}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} />
            ))}
          </div>
        </>
      )}

      <GlowPanel className="p-8 md:p-12 mt-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <PenLine size={24} className="text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 block mb-2">Community</span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">Want to contribute?</h2>
              <p className="text-slate-300 font-medium max-w-xl leading-relaxed">We're always looking for guest writers to share their Python and Data Science expertise.</p>
            </div>
          </div>
          <Link to="/contact" className="btn bg-white text-slate-900 px-8 py-4 hover:bg-amber-400 shrink-0">
            Get in touch <ArrowRight size={16} />
          </Link>
        </div>
      </GlowPanel>

      <AdSlot slot="content" className="h-48 mt-8" />
    </div>
  );
}
