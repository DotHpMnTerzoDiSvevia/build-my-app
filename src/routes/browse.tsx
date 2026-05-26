import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type SearchParams = {
  q?: string;
  type?: "all" | "classified" | "new";
  category?: string;
  condition?: string;
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
};

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    type: (s.type as SearchParams["type"]) ?? "all",
    category: typeof s.category === "string" ? s.category : undefined,
    condition: typeof s.condition === "string" ? s.condition : undefined,
    min: s.min ? Number(s.min) : undefined,
    max: s.max ? Number(s.max) : undefined,
    sort: (s.sort as SearchParams["sort"]) ?? "newest",
  }),
});

function BrowsePage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("name").then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    // Wait for categories before filtering by category (so slugs resolve)
    if (params.category && cats.length === 0) return;
    setLoading(true);
    let q = supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .in("status", ["active", "sold"]);

    if (params.type && params.type !== "all") q = q.eq("type", params.type);
    if (params.category) {
      // Accept either a category UUID or a slug
      const match = cats.find((c) => c.id === params.category || c.slug === params.category);
      q = q.eq("category_id", match?.id ?? params.category);
    }
    if (params.condition) q = q.eq("condition", params.condition as never);
    if (params.min != null) q = q.gte("price", params.min);
    if (params.max != null) q = q.lte("price", params.max);
    if (params.q) {
      const safe = params.q.replace(/%/g, "\\%").replace(/_/g, "\\_");
      q = q.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    if (params.sort === "price_asc") q = q.order("price", { ascending: true });
    else if (params.sort === "price_desc") q = q.order("price", { ascending: false });
    else q = q.order("created_at", { ascending: false });

    q.limit(60).then(({ data }) => {
      setItems((data ?? []) as ListingCardData[]);
      setLoading(false);
    });
  }, [params, cats]);

  const update = (patch: Partial<SearchParams>) => navigate({ search: { ...params, ...patch } as never });

  return (
    <AppLayout>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Catalog</h1>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20 lg:self-start">
          <div>
            <Label className="mb-1.5 block text-xs">Search</Label>
            <Input
              defaultValue={params.q ?? ""}
              placeholder="Title or description…"
              onBlur={(e) => update({ q: e.target.value || undefined })}
              onKeyDown={(e) => {
                if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value || undefined });
              }}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Type</Label>
            <Select value={params.type ?? "all"} onValueChange={(v) => update({ type: v as SearchParams["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="classified">Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Category</Label>
            <Select
              value={params.category ?? "all"}
              onValueChange={(v) => update({ category: v === "all" ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Condition</Label>
            <Select
              value={params.condition ?? "any"}
              onValueChange={(v) => update({ condition: v === "any" ? undefined : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="new_with_tags">New with tags</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5 block text-xs">Min $</Label>
              <Input
                type="number" min={0}
                defaultValue={params.min ?? ""}
                onBlur={(e) => update({ min: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Max $</Label>
              <Input
                type="number" min={0}
                defaultValue={params.max ?? ""}
                onBlur={(e) => update({ max: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Sort</Label>
            <Select value={params.sort ?? "newest"} onValueChange={(v) => update({ sort: v as SearchParams["sort"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate({ search: {} as never })} className="w-full">
            Clear filters
          </Button>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              No listings match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
