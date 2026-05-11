import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

type Params = { q?: string };

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>): Params => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ListingCardData[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) return;

    // Direct PROD-XXXXX → redirect
    if (/^PROD-\d+$/i.test(q.trim())) {
      supabase
        .from("listings")
        .select("id")
        .eq("code", q.trim().toUpperCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data) navigate({ to: "/listing/$id", params: { id: data.id } });
        });
    }

    setLoading(true);
    Promise.all([
      supabase
        .from("listings")
        .select("id,code,title,price,type,condition,quantity,images,featured")
        .eq("status", "active")
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(24),
      supabase.from("profiles").select("id,username,avatar_url").ilike("username", `%${q}%`).limit(10),
    ]).then(([p, u]) => {
      setProducts((p.data ?? []) as ListingCardData[]);
      setUsers(u.data ?? []);
      setLoading(false);
    });
  }, [q, navigate]);

  return (
    <AppLayout>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Search results</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {q ? <>Showing results for <span className="font-medium text-foreground">"{q}"</span></> : "Type something into the search bar."}
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Searching…</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Products & ads</h2>
            {products.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            ) : <p className="text-sm text-muted-foreground">No products found.</p>}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Users</h2>
            {users.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    to="/u/$username"
                    params={{ username: u.username ?? "" }}
                    className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                      {u.avatar_url && <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="font-medium">@{u.username}</div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No users found.</p>}
          </section>
        </>
      )}
    </AppLayout>
  );
}
