import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, ClipboardList, BarChart2, Trash2, ShieldOff, Sparkles, TrendingUp, Package, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";

type Tab = "users" | "moderation" | "ai";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const t = s.tab;
    return { tab: t === "moderation" || t === "ai" || t === "users" ? t : undefined };
  },
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const activeTab: Tab = tab ?? "users";

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [isAdmin, loading, navigate]);

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Admin dashboard</h1>
      <Tabs
        value={activeTab}
        onValueChange={(v) => navigate({ to: "/admin", search: { tab: v as Tab } })}
        className="w-full"
      >
        <TabsList className="mb-6 grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="moderation"><ClipboardList className="mr-2 h-4 w-4" />Moderation</TabsTrigger>
          <TabsTrigger value="ai"><BarChart2 className="mr-2 h-4 w-4" />AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="moderation"><ModerationPanel /></TabsContent>
        <TabsContent value="ai"><AIInsightsPanel /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ─────────── Users ─────────── */
function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, listings: 0, orders: 0 });

  const load = async () => {
    const [{ data: profs }, { count: lc }, { count: oc }] = await Promise.all([
      supabase.from("profiles").select("id,username,full_name,banned,user_roles(role)").limit(200),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);
    setUsers(profs ?? []);
    setStats({ users: profs?.length ?? 0, listings: lc ?? 0, orders: oc ?? 0 });
  };
  useEffect(() => { load(); }, []);

  const promote = async (uid: string, role: "employee" | "admin") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success(`Promoted to ${role}`);
    load();
  };

  const ban = async (uid: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ banned: !banned }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success(banned ? "Unbanned" : "Banned");
    load();
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Users" value={stats.users} />
        <Stat label="Listings" value={stats.listings} />
        <Stat label="Orders" value={stats.orders} />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4 font-semibold">Users</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">User</th><th className="p-3">Roles</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roles = (u.user_roles ?? []).map((r: any) => r.role).join(", ") || "user";
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">
                      {u.username
                        ? <Link to="/u/$username" params={{ username: u.username }} className="hover:underline">@{u.username}</Link>
                        : <span className="text-muted-foreground">{u.full_name ?? "—"}</span>}
                    </td>
                    <td className="p-3">{roles}</td>
                    <td className="p-3">{u.banned ? <span className="text-destructive">banned</span> : "active"}</td>
                    <td className="space-x-1 p-3">
                      <Button size="sm" variant="outline" onClick={() => promote(u.id, "employee")}>+ Staff</Button>
                      <Button size="sm" variant="outline" onClick={() => promote(u.id, "admin")}>+ Admin</Button>
                      <Button size="sm" variant={u.banned ? "outline" : "destructive"} onClick={() => ban(u.id, u.banned)}>
                        {u.banned ? "Unban" : "Ban"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─────────── Moderation ─────────── */
function ModerationPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "classified" | "new">("all");

  const load = async () => {
    let q = supabase
      .from("listings")
      .select("id,code,title,price,type,status,images,seller_id,created_at,profiles!listings_seller_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "all") q = q.eq("type", filter);
    const { data, error } = await q;
    if (error) {
      // fallback without the join if FK alias is unknown
      const { data: d2 } = await supabase
        .from("listings")
        .select("id,code,title,price,type,status,images,seller_id,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(d2 ?? []);
      return;
    }
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const remove = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing removed");
    load();
  };

  const suspend = async (id: string) => {
    const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing suspended");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Filter:</span>
        {(["all", "classified", "new"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filter === t ? "default" : "outline"}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All" : t === "classified" ? "Used ads" : "New products"}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing to moderate.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((l) => (
            <div key={l.id} className="flex gap-3 rounded-xl border bg-card p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {l.images?.[0] && <img src={l.images[0]} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">{l.type === "new" ? "New" : "Used"}</span>
                  <span className="text-xs text-muted-foreground">{l.code}</span>
                  <span className="text-xs">·</span>
                  <span className="text-xs text-muted-foreground">{l.status}</span>
                </div>
                <Link to="/listing/$id" params={{ id: l.id }} className="mt-1 block truncate text-sm font-semibold hover:underline">
                  {l.title}
                </Link>
                <div className="text-xs text-muted-foreground">{formatPrice(l.price)}</div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => suspend(l.id)}><ShieldOff className="mr-1 h-3 w-3" />Suspend</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(l.id)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── AI Insights ─────────── */
function AIInsightsPanel() {
  const [stats, setStats] = useState<any>(null);
  const [topListings, setTopListings] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: listings }, { count: orders }, { count: active }, top, low] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("listings").select("id,title,views,price,images").order("views", { ascending: false }).limit(5),
        supabase.from("listings").select("id,title,quantity,price").eq("type", "new").eq("status", "active").lte("quantity", 3).order("quantity", { ascending: true }).limit(5),
      ]);
      setStats({ users, listings, orders, active });
      setTopListings(top.data ?? []);
      setLowStock(low.data ?? []);
    })();
  }, []);

  if (!stats) return <div className="py-10 text-center text-muted-foreground">Crunching insights…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold">AI overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your marketplace has <strong className="text-foreground">{stats.active}</strong> active listings across <strong className="text-foreground">{stats.users}</strong> users.
              {lowStock.length > 0 && <> {lowStock.length} new product{lowStock.length > 1 ? "s are" : " is"} running low on stock — consider restocking soon.</>}
              {topListings.length > 0 && <> Most-viewed listings are driving engagement; feature them on the home page for a conversion boost.</>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={stats.users} icon={Users} />
        <Stat label="Total listings" value={stats.listings} icon={Package} />
        <Stat label="Active" value={stats.active} icon={TrendingUp} />
        <Stat label="Orders" value={stats.orders} icon={ShoppingBag} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Top viewed
          </div>
          {topListings.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <ul className="divide-y">
              {topListings.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {l.images?.[0] && <img src={l.images[0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <Link to="/listing/$id" params={{ id: l.id }} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{l.title}</Link>
                  <span className="text-xs text-muted-foreground">{l.views ?? 0} views</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4 font-semibold">
            <Package className="h-4 w-4 text-warning" /> Low stock alerts
          </div>
          {lowStock.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">All new products are well stocked. 🎉</div>
          ) : (
            <ul className="divide-y">
              {lowStock.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                  <Link to="/listing/$id" params={{ id: l.id }} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{l.title}</Link>
                  <span className={`text-xs font-semibold ${l.quantity === 0 ? "text-destructive" : "text-warning"}`}>
                    {l.quantity === 0 ? "Sold out" : `${l.quantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon?: any }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}{label}
      </div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
