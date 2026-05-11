import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { Stars } from "@/components/Reviews";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [openReview, setOpenReview] = useState<{ orderId: string; sellerId: string; listingId: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select(
        "id,tracking_number,total,status,created_at,shipping_address,order_items(listing_id,seller_id,title,price,quantity)",
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    const { data: revs } = await supabase
      .from("reviews")
      .select("order_id,seller_id")
      .eq("reviewer_id", user.id);
    setReviewed(new Set(revs?.map((r) => `${r.order_id}-${r.seller_id}`) ?? []));
  };

  useEffect(() => {
    load();
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
              <ul className="mt-2 space-y-1 text-sm">
                {o.order_items.map((it: any, i: number) => {
                  const key = `${o.id}-${it.seller_id}`;
                  const done = reviewed.has(key);
                  return (
                    <li key={i} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>
                        {it.title} × {it.quantity} — {formatPrice(it.price * it.quantity)}
                      </span>
                      {it.seller_id !== user.id && (
                        <Button
                          size="sm"
                          variant={done ? "secondary" : "outline"}
                          disabled={done}
                          onClick={() =>
                            setOpenReview({ orderId: o.id, sellerId: it.seller_id, listingId: it.listing_id })
                          }
                        >
                          <Star className="mr-1 h-3 w-3" />
                          {done ? "Reviewed" : "Review"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {openReview && (
        <ReviewModal
          {...openReview}
          onClose={() => {
            setOpenReview(null);
            load();
          }}
        />
      )}
    </AppLayout>
  );
}

function ReviewModal({
  orderId,
  sellerId,
  listingId,
  onClose,
}: {
  orderId: string;
  sellerId: string;
  listingId: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      seller_id: sellerId,
      listing_id: listingId,
      reviewer_id: user.id,
      rating,
      comment: comment || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Review posted");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-lg font-semibold">Leave a review</h3>
        <div className="mb-3">
          <Stars value={rating} onChange={setRating} size={28} />
        </div>
        <Textarea
          rows={4}
          placeholder="Optional comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Posting…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
