import { Link } from "react-router-dom";
import { Clock, Eye } from "lucide-react";
import type { PostSummary } from "../../lib/types";
import { cn, formatDate } from "../../lib/utils";

/** Turns a category slug into a readable fallback label ("data-viz" -> "data viz"). */
function prettySlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** Cover image with an amber placeholder (first letter of the title) when no image is set. */
export function PostCover({ post, className, letterClass }: { post: PostSummary; className?: string; letterClass?: string }) {
  if (post.coverImage) {
    return <img src={post.coverImage} alt={post.title} loading="lazy" className={cn("object-cover", className)} />;
  }
  return (
    <div className={cn("bg-amber-50 flex items-center justify-center", className)} aria-hidden="true">
      <span className={cn("font-black text-amber-200 select-none leading-none", letterClass ?? "text-7xl")}>{post.title.trim().charAt(0).toUpperCase() || "P"}</span>
    </div>
  );
}

/** Amber category pill. Rendered above the card's stretched link so it stays independently clickable. */
export function CategoryChip({ slug, name, className }: { slug: string; name?: string; className?: string }) {
  return (
    <Link
      to={`/category/${slug}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "relative z-10 inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 hover:border-amber-300 transition-colors",
        className,
      )}
    >
      {name ?? prettySlug(slug)}
    </Link>
  );
}

/** Date / read time / views meta line. */
export function PostMeta({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-400", className)}>
      <span>{formatDate(post.publishedAt)}</span>
      {post.readTime && (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} /> {post.readTime}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <Eye size={12} /> {post.views.toLocaleString()}
      </span>
    </div>
  );
}

/**
 * Standard vertical post card. The title carries a stretched link covering the whole
 * card (after:inset-0); the category chip sits above it with z-10 so both stay clickable
 * without nesting anchors.
 */
export function PostCard({ post, categoryName, size = "md" }: { post: PostSummary; categoryName?: string; size?: "md" | "lg" }) {
  return (
    <article className="card relative group overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <PostCover post={post} className="aspect-video w-full rounded-t-2xl" />
      <div className={cn("flex flex-col gap-3 flex-1", size === "lg" ? "p-6 md:p-8" : "p-5 md:p-6")}>
        <div>
          <CategoryChip slug={post.category} name={categoryName} />
        </div>
        <h3 className={cn("font-black text-slate-900 tracking-tighter leading-snug group-hover:text-amber-600 transition-colors", size === "lg" ? "text-xl md:text-2xl" : "text-lg")}>
          <Link to={`/blog/${post.id}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">{post.excerpt}</p>
        <PostMeta post={post} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

/** Compact horizontal variant for dense lists (small thumbnail left, text right). */
export function PostRow({ post, categoryName }: { post: PostSummary; categoryName?: string }) {
  return (
    <article className="card relative group overflow-hidden flex hover:shadow-lg transition-all">
      <div className="w-28 sm:w-40 shrink-0 overflow-hidden">
        <PostCover post={post} className="h-full w-full" letterClass="text-4xl" />
      </div>
      <div className="flex flex-col gap-1.5 p-4 min-w-0 flex-1">
        <div>
          <CategoryChip slug={post.category} name={categoryName} />
        </div>
        <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-snug line-clamp-2 group-hover:text-amber-600 transition-colors">
          <Link to={`/blog/${post.id}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <PostMeta post={post} className="mt-auto" />
      </div>
    </article>
  );
}

/** Wide two-column card for the newest article (image left / text right on lg). */
export function FeaturedPostCard({ post, categoryName }: { post: PostSummary; categoryName?: string }) {
  return (
    <article className="card relative group overflow-hidden grid lg:grid-cols-2 hover:shadow-xl transition-all">
      <PostCover post={post} className="aspect-video lg:aspect-auto lg:h-full w-full" letterClass="text-8xl" />
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">Featured</span>
          <CategoryChip slug={post.category} name={categoryName} />
        </div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-amber-600 transition-colors">
          <Link to={`/blog/${post.id}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed line-clamp-3">{post.excerpt}</p>
        <PostMeta post={post} />
      </div>
    </article>
  );
}

/** Loading placeholder matching PostCard's shape. */
export function PostCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-video w-full rounded-none" />
      <div className="p-5 md:p-6 space-y-3">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
