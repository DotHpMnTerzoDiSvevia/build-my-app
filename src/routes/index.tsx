import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Tag, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
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
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-transparent to-accent/30 p-8 sm:p-14">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" /> One marketplace, new & pre-loved
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find it. Sell it. <span className="text-primary">All in TheVault.</span>
          </h1>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Browse a unified catalog mixing brand-new products and classified ads from real people.
            Post an ad in minutes, chat with sellers, and check out in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/browse">
                <ShoppingBag className="mr-2 h-4 w-4" /> Browse catalog
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/sell">
                <Tag className="mr-2 h-4 w-4" /> Sell something
              </Link>
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
