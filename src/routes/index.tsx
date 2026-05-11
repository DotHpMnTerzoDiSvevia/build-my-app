import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Tag, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [featured, setFeatured] = useState<ListingCardData[]>([]);
  const [recent, setRecent] = useState<ListingCardData[]>([]);

  useEffect(() => {
    supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .eq("status", "active")
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setFeatured((data ?? []) as ListingCardData[]));

    supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setRecent((data ?? []) as ListingCardData[]));
  }, []);

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-accent/20 p-8 sm:p-14">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> One marketplace, new & pre-loved
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find it. Sell it. <span className="text-primary">All in TheVault.</span>
          </h1>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Browse a unified catalog mixing brand-new products and classified ads from real people.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = q.trim();
              navigate({ to: t ? "/search" : "/browse", search: t ? { q: t } : {} });
            }}
            className="relative mt-6"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anything — bikes, sneakers, PROD-12345…"
              className="h-14 rounded-2xl pl-12 pr-28 text-base shadow-sm"
            />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl">
              Search
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/browse">All listings</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/browse" search={{ type: "new" }}>New products</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/browse" search={{ type: "classified" }}>Classified ads</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/sell"><Tag className="mr-1.5 h-3.5 w-3.5" />Sell something</Link>
            </Button>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <Section title="Featured" linkTo="/browse" linkText="View all">
          <Grid items={featured} />
        </Section>
      )}

      <Section title="Just listed" linkTo="/browse" linkText="See more">
        {recent.length > 0 ? (
          <Grid items={recent} />
        ) : (
          <EmptyState />
        )}
      </Section>
    </AppLayout>
  );
}

function Section({
  title,
  linkTo,
  linkText,
  children,
}: {
  title: string;
  linkTo: string;
  linkText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Link
          to={linkTo}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          {linkText} <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Grid({ items }: { items: ListingCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((l) => (
        <ListingCard key={l.id} l={l} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      No listings yet. Be the first to{" "}
      <Link to="/sell" className="text-foreground underline underline-offset-4">
        post an ad
      </Link>
      .
    </div>
  );
}
