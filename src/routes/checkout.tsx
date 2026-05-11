import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, Lock, Truck, MapPin, CreditCard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ tracking: string; orderId: string } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cart_items")
      .select("id,quantity,listing:listings(id,code,title,price,type,seller_id,quantity,status)")
      .eq("user_id", user.id)
      .then(({ data }) => setItems((data ?? []).filter((r: any) => r.listing && r.listing.status === "active")));
  }, [user]);

  const total = items.reduce((s, r) => s + Number(r.listing.price) * r.quantity, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setBusy(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        total,
        shipping_address: { name, address: addr, city, zip },
      })
      .select("id,tracking_number").single();

    if (error || !order) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    await supabase.from("order_items").insert(items.map((r) => ({
      order_id: order.id,
      listing_id: r.listing.id,
      seller_id: r.listing.seller_id,
      title: r.listing.title,
      price: r.listing.price,
      quantity: r.quantity,
      type: r.listing.type,
    })));

    // Update listings: classified → sold; new → decrement quantity (mark sold if reaches 0)
    for (const r of items) {
      if (r.listing.type === "classified") {
        await supabase.from("listings").update({ status: "sold", quantity: 0 }).eq("id", r.listing.id);
        // Remove from all carts (RLS only allows own; best-effort: own row deleted by clearing below)
      } else {
        const newQty = Math.max(0, (r.listing.quantity ?? 0) - r.quantity);
        await supabase
          .from("listings")
          .update({ quantity: newQty, status: newQty === 0 ? "sold" : "active" })
          .eq("id", r.listing.id);
      }
      // Notify seller
      await supabase.from("notifications").insert({
        user_id: r.listing.seller_id,
        type: "sale",
        title: `You sold "${r.listing.title}"`,
        body: `Order ${order.tracking_number}`,
        link: `/orders`,
      });
    }

    // Clear buyer's cart
    await supabase.from("cart_items").delete().eq("user_id", user.id);

    setBusy(false);
    setDone({ tracking: order.tracking_number, orderId: order.id });
  };

  if (!user) return null;

  if (done) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md py-10 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success ring-8 ring-success/5">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold">Order confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">A confirmation has been sent to your email.</p>
          <div className="mx-auto mt-5 max-w-xs rounded-2xl border bg-card p-4 text-left">
            <div className="text-xs text-muted-foreground">Tracking number</div>
            <div className="mt-1 font-mono text-lg font-semibold">{done.tracking}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Estimated delivery in 3–5 days (simulated)
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No real charge was made — this is a demo checkout.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild><Link to="/orders">View orders</Link></Button>
            <Button asChild variant="outline"><Link to="/browse">Keep shopping</Link></Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-sm text-muted-foreground">Review your order and ship it (simulated).</p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            <Lock className="h-3 w-3" /> Secure demo checkout
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Your cart is empty. <Link to="/browse" className="underline">Browse</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <section className="rounded-2xl border bg-card p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" />Shipping address</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label className="mb-1.5 block">Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div className="col-span-2"><Label className="mb-1.5 block">Address</Label><Input value={addr} onChange={(e) => setAddr(e.target.value)} required placeholder="Street, number, apt." /></div>
                  <div><Label className="mb-1.5 block">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                  <div><Label className="mb-1.5 block">ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} required /></div>
                </div>
              </section>

              <section className="rounded-2xl border bg-card p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4 text-primary" />Payment</h2>
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
                  <div className="font-medium">Demo payment</div>
                  <p className="mt-1 text-xs text-muted-foreground">No card required — your order will be placed instantly with a generated tracking number.</p>
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
              <h2 className="text-sm font-semibold">Order summary</h2>
              <div className="space-y-2 text-sm">
                {items.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3">
                    <span className="line-clamp-1 text-muted-foreground">{r.listing.title} <span className="text-foreground">× {r.quantity}</span></span>
                    <span className="shrink-0 font-medium">{formatPrice(r.listing.price * r.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="text-success">Free</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
              <Button type="submit" disabled={busy} size="lg" className="w-full">
                {busy ? "Placing order…" : `Place order · ${formatPrice(total)}`}
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Simulated transaction · no real charge
              </div>
            </aside>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
