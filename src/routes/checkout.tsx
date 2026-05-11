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
import { CheckCircle2 } from "lucide-react";

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
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Order confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your tracking number is <span className="font-mono font-semibold text-foreground">{done.tracking}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">(simulated payment — no real charge)</p>
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
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Checkout</h1>
        <p className="mb-6 text-sm text-muted-foreground">This is a simulated checkout — no real charge or shipment.</p>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Your cart is empty. <Link to="/browse" className="underline">Browse</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="rounded-xl border bg-card p-4 text-sm">
              <div className="mb-2 font-semibold">Order summary</div>
              {items.map((r) => (
                <div key={r.id} className="flex justify-between py-1">
                  <span>{r.listing.title} × {r.quantity}</span>
                  <span>{formatPrice(r.listing.price * r.quantity)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total</span><span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="mb-1.5 block">Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="col-span-2"><Label className="mb-1.5 block">Address</Label><Input value={addr} onChange={(e) => setAddr(e.target.value)} required /></div>
              <div><Label className="mb-1.5 block">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
              <div><Label className="mb-1.5 block">ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} required /></div>
            </div>

            <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              💳 Payment is simulated. Click below to place your order — no real card needed.
            </div>

            <Button type="submit" disabled={busy} size="lg" className="w-full">
              {busy ? "Placing order…" : `Place order (${formatPrice(total)})`}
            </Button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
