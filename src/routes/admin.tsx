import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<{ users: number; listings: number; orders: number }>({ users: 0, listings: 0, orders: 0 });

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [isAdmin, loading, navigate]);

  const load = async () => {
    const [{ data: profs }, { count: lc }, { count: oc }] = await Promise.all([
      supabase.from("profiles").select("id,username,full_name,banned,user_roles(role)").limit(100),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]);
    setUsers(profs ?? []);
    setStats({ users: profs?.length ?? 0, listings: lc ?? 0, orders: oc ?? 0 });
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

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

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Admin dashboard</h1>
      <div className="mb-8 grid grid-cols-3 gap-4">
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
                    <td className="p-3"><Link to="/u/$username" params={{ username: u.username ?? "" }} className="hover:underline">@{u.username}</Link></td>
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
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
