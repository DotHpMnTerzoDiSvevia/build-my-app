import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ListingCardData[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wishlist_items")
      .select("listing:listings(id,code,title,price,type,condition,quantity,images,featured,status)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const list = (data ?? [])
          .map((r: any) => r.listing)
          .filter((l: any) => l && l.status === "active") as ListingCardData[];
        setItems(list);
      });
  }, [user]);

  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your wishlist</h1>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing saved yet. <Link to="/browse" className="text-foreground underline">Browse the catalog</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </AppLayout>
  );
}
