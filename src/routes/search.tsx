import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Search, Mic, X, SlidersHorizontal, Search as SearchIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Params = { q?: string };

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>): Params => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

const RECENT_KEY = "vault_recent_searches";
const getRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
};
const saveRecent = (q: string) => {
  const prev = getRecent().filter((x) => x !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 6)));
};

const TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Used", value: "classified" },
];
const SORT_OPTIONS = [
  { label: "Relevance", value: "" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
  { label: "Newest", value: "newest" },
];

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQ ?? "");
  const [products, setProducts] = useState<ListingCardData[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent);
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const runSearch = async (query: string) => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    setRecent(getRecent());

    if (/^PROD-\d+$/i.test(query.trim())) {
      const { data } = await supabase
        .from("listings")
        .select("id")
        .eq("code", query.trim().toUpperCase())
        .maybeSingle();
      if (data) { navigate({ to: "/listing/$id", params: { id: data.id } }); return; }
    }

    setLoading(true);
    const safe = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    let pq = supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .eq("status", "active")
      .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
      .limit(24);
    if (typeFilter) pq = pq.eq("type", typeFilter as "new" | "classified");
    if (sortBy === "price_asc") pq = pq.order("price", { ascending: true });
    else if (sortBy === "price_desc") pq = pq.order("price", { ascending: false });
    else pq = pq.order("created_at", { ascending: false });

    const [p, u] = await Promise.all([
      pq,
      supabase.from("profiles").select("id,username,avatar_url").ilike("username", `%${query}%`).limit(8),
    ]);
    setProducts((p.data ?? []) as ListingCardData[]);
    setUsers(u.data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (initialQ) runSearch(initialQ); }, [initialQ, typeFilter, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim() } });
    runSearch(q.trim());
  };

  const hasResults = products.length > 0 || users.length > 0;
  const showEmpty = q && !loading && !hasResults;

  return (
    <AppLayout>
      {/* Search bar */}
      <div className="sticky top-14 z-30 -mx-4 bg-background/95 px-4 pb-3 pt-3 backdrop-blur-xl border-b border-border/40 md:static md:border-0 md:bg-transparent md:pb-0 md:pt-0 md:backdrop-blur-none">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, ads, users…"
              className="h-11 rounded-2xl border-border/60 pl-10 pr-10 text-sm"
              id="search-input"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="button" aria-label="Voice search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground hover:text-foreground transition">
            <Mic className="h-4 w-4" />
          </button>
        </form>

        {/* Filter pills */}
        {q && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                  typeFilter === f.value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-accent/40",
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="mx-1 h-5 w-px bg-border self-center" />
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSortBy(s.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                  sortBy === s.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent searches (when no query) */}
      {!q && recent.length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent</h2>
            <button
              onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => { setQ(r); navigate({ to: "/search", search: { q: r } }); }}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:border-accent/40 hover:bg-accent/5 transition"
              >
                <Search className="h-3 w-3 text-muted-foreground" />
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="mt-5 space-y-8">
          {products.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Products & Ads
                <span className="ml-2 font-normal normal-case text-muted-foreground/60">({products.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            </section>
          )}
          {users.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Users
                <span className="ml-2 font-normal normal-case text-muted-foreground/60">({users.length})</span>
              </h2>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    to="/u/$username"
                    params={{ username: u.username ?? "" }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:border-accent/40 hover:bg-accent/5 transition"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        : <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">{(u.username ?? "?")[0].toUpperCase()}</div>
                      }
                    </div>
                    <div>
                      <div className="font-semibold">@{u.username}</div>
                      <div className="text-xs text-muted-foreground">View profile</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showEmpty && (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <SearchIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          No results for <span className="font-semibold text-foreground">"{q}"</span>.<br />
          Try a different keyword or check the filters.
        </div>
      )}

      {!q && !recent.length && (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          Start typing to search products, used items, and users.
        </div>
      )}
    </AppLayout>
  );
}
