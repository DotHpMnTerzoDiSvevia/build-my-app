import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, ShoppingCart } from "lucide-react";
import { SwipeToDelete } from "@/components/SwipeToDelete";

export const Route = createFileRoute("/cart")({ component: CartPage });

type Row = {
  id: string; quantity: number;
  listing: { id: string; code: string; title: string; price: number; images: string[]; type: string; quantity: number; status: string } | null;
};

function CartPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);

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
    toast.success("Removed");
    load();
  };

  const items = rows.filter((r) => r.listing && r.listing.status === "active");
  const total = items.reduce((s, r) => s + Number(r.listing!.price) * r.quantity, 0);

  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your cart</h1>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Cart is empty. <Link to="/browse" className="text-foreground underline">Browse the catalog</Link>.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground md:hidden">Tip: swipe a card left to delete.</p>
            {items.map((r) => (
              <SwipeToDelete key={r.id} onDelete={() => remove(r.id)} className="border">
                <div className="flex gap-3 p-3">
                  <Link to="/listing/$id" params={{ id: r.listing!.id }} className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {r.listing!.images[0] && <img src={r.listing!.images[0]} alt="" className="h-full w-full object-cover" />}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link to="/listing/$id" params={{ id: r.listing!.id }} className="line-clamp-1 font-medium hover:underline">
                      {r.listing!.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.listing!.code} · qty {r.quantity}</div>
                    <div className="mt-auto font-semibold">{formatPrice(Number(r.listing!.price) * r.quantity)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="hidden md:inline-flex"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </SwipeToDelete>
            ))}
          </div>
          <aside className="h-fit space-y-3 rounded-xl border bg-card p-4">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>Free (sim.)</span></div>
            <div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Button asChild className="w-full"><Link to="/checkout"><ShoppingCart className="mr-2 h-4 w-4" />Checkout</Link></Button>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}
