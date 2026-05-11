import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-listings")({ component: MyListingsPage });

function MyListingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ListingCardData[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("listings")
      .select("id,code,title,price,type,condition,quantity,images,featured,status")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as ListingCardData[]));
  }, [user]);

  if (!user) return null;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My listings</h1>
        <Button asChild><Link to="/sell">Post new ad</Link></Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          You haven't listed anything yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </AppLayout>
  );
}
