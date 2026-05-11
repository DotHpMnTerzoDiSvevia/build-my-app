import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,tracking_number,total,status,created_at,shipping_address,order_items(title,price,quantity)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [user]);

  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No orders yet. <Link to="/browse" className="underline text-foreground">Start shopping</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-sm">{o.tracking_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <Badge>{o.status}</Badge>
                <div className="font-semibold">{formatPrice(o.total)}</div>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {o.order_items.map((it: any, i: number) => (
                  <li key={i}>{it.title} × {it.quantity} — {formatPrice(it.price * it.quantity)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
