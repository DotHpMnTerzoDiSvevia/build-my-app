import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setItems(data ?? []);
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };
  useEffect(() => { load(); }, [user]);

  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          You're all caught up.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Link
              key={n.id}
              to={n.link ?? "/"}
              className={`block rounded-xl border p-4 transition-colors hover:bg-muted dark:hover:bg-transparent ${n.read ? "" : "border-primary/40 bg-primary/5"}`}
            >
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
              <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
