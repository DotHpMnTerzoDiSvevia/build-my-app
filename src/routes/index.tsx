import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Shirt,
  Home,
  Trophy,
  BookOpen,
  Car,
  Sparkles,
  Music,
  Gamepad2,
  Sprout,
  Pizza,
  Palette,
  Dog,
  Plane,
  List,
  Star,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

// ── Category icon map ────────────────────────────────────────────────────────
const CAT_ICON: Record<string, React.ElementType> = {
  electronics: Laptop,
  fashion: Shirt,
  clothing: Shirt,
  home: Home,
  sports: Trophy,
  books: BookOpen,
  toys: Gamepad2, // Fallback for toys
  automotive: Car,
  beauty: Sparkles,
  music: Music,
  games: Gamepad2,
  garden: Sprout,
  food: Pizza,
  art: Palette,
  pets: Dog,
  travel: Plane,
};

// ── Promo banners ──────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: 1,
    label: "New arrivals",
    title: "Brand new products, delivered fast",
    sub: "Shop the latest electronics, fashion & more",
    cta: "Shop now",
    to: "/browse",
    search: { type: "new" as const },
    bg: "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
  },
  {
    id: 2,
    label: "Used ads",
    title: "Great finds from real people",
    sub: "Pre-loved items at amazing prices",
    cta: "Browse ads",
    to: "/browse",
    search: { type: "classified" as const },
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
  },
  {
    id: 3,
    label: "Sell with us",
    title: "Turn your stuff into cash",
    sub: "Post a free used ad in under 2 minutes",
    cta: "Post an ad",
    to: "/sell",
    search: {},
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
  },
];

function BannerCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(timer.current);
  }, [paused]);

  const b = BANNERS[idx];

  return (
    <div
      className={cn("relative overflow-hidden rounded-md border", b.bg, "transition-colors duration-500")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative px-12 py-12 sm:px-10 sm:py-16">
        <span className="mb-3 inline-flex items-center rounded-sm bg-background/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm">
          {b.label}
        </span>

        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{b.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{b.sub}</p>

        <Button asChild className="mt-5 px-6 font-semibold rounded-sm bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
          <Link to={b.to as any} search={b.search as any}>
            {b.cta} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>

        {/* Dots */}
        <div className="mt-6 flex gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx ? "w-6 bg-accent" : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Prev/Next arrows */}
      <button
        onClick={() => setIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-sm bg-background/80 shadow hover:bg-background"
        aria-label="Previous banner"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIdx((i) => (i + 1) % BANNERS.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-sm bg-background/80 shadow hover:bg-background"
        aria-label="Next banner"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<ListingCardData[]>([]);
  const [recent, setRecent] = useState<ListingCardData[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeType, setActiveType] = useState<"all" | "new" | "classified">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug")
      .order("name")
      .then(({ data }) => setCats(data ?? []));

    supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .in("status", ["active", "sold"])
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setFeatured((data ?? []) as ListingCardData[]));
  }, []);

  const loadRecent = async (reset = false) => {
    const p = reset ? 0 : page;
    const limit = 12;
    let q = supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .in("status", ["active", "sold"])
      .order("created_at", { ascending: false })
      .range(p * limit, p * limit + limit - 1);
    if (activeType !== "all") q = q.eq("type", activeType);
    const { data } = await q;
    const rows = (data ?? []) as ListingCardData[];
    const featuredIds = new Set(featured.map((f) => f.id));
    setRecent((prev) => {
      const base = reset ? [] : prev;
      const seen = new Set(base.map((x) => x.id));
      const merged = [...base];
      for (const r of rows) {
        if (!featuredIds.has(r.id) && !seen.has(r.id)) { merged.push(r); seen.add(r.id); }
      }
      return merged;
    });
    setHasMore(rows.length === limit);
    if (!reset) setPage(p + 1);
  };

  useEffect(() => {
    setPage(0);
    loadRecent(true);
  }, [activeType]);

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && hasMore) loadRecent(); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, page, activeType]);

  return (
    <AppLayout>
      {/* Banner carousel */}
      <BannerCarousel />

      {/* Categories horizontal scroll */}
      {cats.length > 0 && (
        <section className="mt-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => navigate({ to: "/browse" })}
              className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-xs font-medium transition hover:border-accent hover:bg-accent/5 w-[80px]"
            >
              <List className="h-6 w-6 text-muted-foreground" />
              <span className="text-[11px] font-semibold">All</span>
            </button>
            {cats.map((c) => {
              const Icon = CAT_ICON[c.slug] || Package;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate({ to: "/browse", search: { category: c.slug } })}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-xs font-medium transition hover:border-accent hover:bg-accent/5 w-[80px]"
                >
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[11px] font-semibold whitespace-nowrap truncate w-full text-center">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
            <h2 className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
              <Star className="h-5 w-5 text-warning fill-warning" /> Featured
            </h2>
            <Link to="/browse" className="inline-flex items-center text-xs text-accent hover:underline font-semibold">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

      {/* Just Listed with filter tabs */}
      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
          <h2 className="text-lg font-bold tracking-tight">Just Listed</h2>
          <Link to="/browse" className="inline-flex items-center text-xs text-accent hover:underline font-semibold">
            See more <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex gap-2">
          {(["all", "new", "classified"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={cn(
                "rounded-sm border px-4 py-1.5 text-xs font-bold capitalize transition-colors",
                activeType === t
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : t === "new" ? "New" : "Used"}
            </button>
          ))}
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            No listings yet. Be the first to{" "}
            <Link to="/sell" className="text-accent underline underline-offset-4 font-medium">
              post an ad
            </Link>
            .
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="mt-6 flex justify-center">
          {hasMore && recent.length > 0 && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading more…</span>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
