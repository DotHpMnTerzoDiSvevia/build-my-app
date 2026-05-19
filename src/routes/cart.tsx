import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, ShoppingBag, Minus, Plus, AlertTriangle, Lightbulb, Lock } from "lucide-react";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cart")({ component: CartPage });

type Row = {
  id: string;
  quantity: number;
  listing: {
    id: string; code: string; title: string; price: number;
    images: string[]; type: string; quantity: number; status: string;
  } | null;
};

function CartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cart_items")
      .select("id,quantity,listing:listings(id,code,title,price,images,type,quantity,status)")
      .eq("user_id", user.id);
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    toast.success("Item removed");
    load();
  };

  const changeQty = async (id: string, current: number, delta: number, max: number) => {
    const next = current + delta;
    if (next < 1) { remove(id); return; }
    if (next > max) { toast.warning(`Only ${max} left in stock`); return; }
    setUpdating(id);
    await supabase.from("cart_items").update({ quantity: next }).eq("id", id);
    setUpdating(null);
    load();
  };

  const items = rows.filter((r) => r.listing && r.listing.status === "active");
  const subtotal = items.reduce((s, r) => s + Number(r.listing!.price) * r.quantity, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total = subtotal + shipping;

  if (!user) return null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Cart</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-9 w-9 text-muted-foreground/50" />
          </div>
          <h2 className="text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add some items to get started</p>
          <Button asChild className="mt-5 rounded-full px-6">
            <Link to="/browse">Browse catalog</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Items */}
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground md:hidden flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Swipe left on an item to remove it quickly
            </div>
            {items.map((r) => {
              const l = r.listing!;
              const lowStock = l.type === "new" && l.quantity <= 3 && l.quantity > 0;
              return (
                <SwipeToDelete key={r.id} onDelete={() => remove(r.id)} className="rounded-2xl border border-border/60 overflow-hidden">
                  <div className="flex gap-3 bg-card p-3">
                    {/* Thumbnail */}
                    <Link
                      to="/listing/$id"
                      params={{ id: l.id }}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
                    >
                      {l.images[0] && (
                        <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex flex-1 flex-col min-w-0">
                      <Link
                        to="/listing/$id"
                        params={{ id: l.id }}
                        className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                      >
                        {l.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            l.type === "new"
                              ? "bg-success/15 text-success"
                              : "bg-accent/15 text-accent",
                          )}
                        >
                          {l.type === "new" ? "New" : "Classified"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{l.code}</span>
                      </div>

                      {lowStock && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-warning font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Only {l.quantity} left in stock
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="font-bold">{formatPrice(Number(l.price) * r.quantity)}</div>

                        {/* Quantity stepper — only for new products */}
                        {l.type === "new" ? (
                          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background px-1">
                            <button
                              onClick={() => changeQty(r.id, r.quantity, -1, l.quantity)}
                              disabled={updating === r.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-semibold">
                              {updating === r.id ? "…" : r.quantity}
                            </span>
                            <button
                              onClick={() => changeQty(r.id, r.quantity, +1, l.quantity)}
                              disabled={updating === r.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Qty: 1</span>
                        )}
                      </div>
                    </div>

                    {/* Desktop remove */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(r.id)}
                      className="hidden shrink-0 self-start text-muted-foreground hover:text-destructive md:flex"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>

          {/* Order summary */}
          <aside className="h-fit space-y-3 rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shipping === 0 ? "text-success font-medium" : ""}>
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Add {formatPrice(50 - subtotal)} more for free shipping
                </p>
              )}
            </div>
            <div className="flex justify-between border-t border-border/60 pt-3 font-bold">
              <span>Total</span>
              <span className="text-lg">{formatPrice(total)}</span>
            </div>
            <Button asChild className="w-full rounded-full">
              <Link to="/checkout">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Proceed to Checkout
              </Link>
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure simulated checkout — no real charges
            </p>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}
