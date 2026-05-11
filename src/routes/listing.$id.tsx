import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, CONDITION_LABELS } from "@/lib/format";
import { Heart, ShoppingCart, BellRing, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetail,
});

type Listing = {
  id: string;
  code: string;
  type: "classified" | "new";
  seller_id: string;
  title: string;
  description: string;
  price: number;
  condition: string | null;
  sku: string | null;
  quantity: number;
  images: string[];
  featured: boolean;
  status: string;
  views: number;
  created_at: string;
  category_id: string | null;
};

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [l, setL] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (!data) { setLoading(false); return; }
      setL(data as Listing);
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("username,avatar_url").eq("id", data.seller_id).maybeSingle(),
        data.category_id
          ? supabase.from("categories").select("name").eq("id", data.category_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setSeller(p ?? null);
      setCategory(c?.name ?? null);
      setLoading(false);

      // increment views (best effort)
      supabase.from("listings").update({ views: (data.views ?? 0) + 1 }).eq("id", id).then(() => {});

      if (user) {
        const [{ data: w }, { data: s }] = await Promise.all([
          supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("listing_id", id).maybeSingle(),
          supabase.from("restock_subscriptions").select("id").eq("user_id", user.id).eq("listing_id", id).maybeSingle(),
        ]);
        setInWishlist(!!w);
        setSubscribed(!!s);
      }
    })();
  }, [id, user]);

  if (loading) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading…</div></AppLayout>;
  if (!l) return <AppLayout><div className="py-20 text-center">Not found.</div></AppLayout>;

  const soldOut = l.type === "new" && l.quantity === 0;
  const isOwner = user?.id === l.seller_id;

  const requireAuth = () => {
    if (!user) { navigate({ to: "/auth" }); return false; }
    return true;
  };

  const toggleWishlist = async () => {
    if (!requireAuth()) return;
    if (inWishlist) {
      await supabase.from("wishlist_items").delete().eq("user_id", user!.id).eq("listing_id", id);
      setInWishlist(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user!.id, listing_id: id });
      setInWishlist(true);
      toast.success("Added to wishlist");
    }
  };

  const addToCart = async () => {
    if (!requireAuth()) return;
    if (isOwner) return toast.error("You can't buy your own listing.");
    const { error } = await supabase
      .from("cart_items")
      .upsert({ user_id: user!.id, listing_id: id, quantity: 1 }, { onConflict: "user_id,listing_id" });
    if (error) return toast.error(error.message);
    toast.success("Added to cart");
  };

  const subscribe = async () => {
    if (!requireAuth()) return;
    if (subscribed) {
      await supabase.from("restock_subscriptions").delete().eq("user_id", user!.id).eq("listing_id", id);
      setSubscribed(false);
      toast.success("Notification cancelled");
    } else {
      await supabase.from("restock_subscriptions").insert({ user_id: user!.id, listing_id: id });
      setSubscribed(true);
      toast.success("We'll notify you when it's back in stock");
    }
  };

  const del = async () => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("listings").delete().eq("id", id);
    toast.success("Deleted");
    navigate({ to: "/" });
  };

  const startChat = async () => {
    if (!requireAuth()) return;
    if (isOwner) return toast.error("That's your own listing.");
    // Will be wired in next turn
    toast.info("Chat is coming in the next update.");
  };

  return (
    <AppLayout>
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            {l.images[activeImg] ? (
              <img src={l.images[activeImg]} alt={l.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
            )}
          </div>
          {l.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {l.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="flex flex-wrap gap-1">
            <Badge variant={l.type === "new" ? "default" : "secondary"}>
              {l.type === "new" ? "New" : "Classified"}
            </Badge>
            {l.featured && <Badge className="bg-amber-500 hover:bg-amber-500">Featured</Badge>}
            {category && <Badge variant="outline">{category}</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{l.title}</h1>
          <div className="text-3xl font-bold">{formatPrice(l.price)}</div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-mono">{l.code}</dd>
            </div>
            {l.sku && (
              <div>
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="font-mono">{l.sku}</dd>
              </div>
            )}
            {l.condition && (
              <div>
                <dt className="text-muted-foreground">Condition</dt>
                <dd>{CONDITION_LABELS[l.condition]}</dd>
              </div>
            )}
            {l.type === "new" && (
              <div>
                <dt className="text-muted-foreground">Stock</dt>
                <dd>{l.quantity > 0 ? `${l.quantity} available` : "Sold out"}</dd>
              </div>
            )}
          </dl>

          {seller && (
            <Link
              to="/u/$username" params={{ username: seller.username ?? "" }}
              className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                {seller.avatar_url && <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Seller</div>
                <div className="font-medium">@{seller.username}</div>
              </div>
            </Link>
          )}

          <div className="space-y-2">
            {soldOut ? (
              <Button onClick={subscribe} variant={subscribed ? "outline" : "default"} className="w-full" size="lg">
                <BellRing className="mr-2 h-4 w-4" />
                {subscribed ? "You'll be notified" : "Notify me when available"}
              </Button>
            ) : (
              <Button onClick={addToCart} className="w-full" size="lg" disabled={isOwner}>
                <ShoppingCart className="mr-2 h-4 w-4" />Add to cart
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={toggleWishlist} variant="outline">
                <Heart className={`mr-2 h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
                {inWishlist ? "Saved" : "Wishlist"}
              </Button>
              <Button onClick={startChat} variant="outline">Chat seller</Button>
            </div>
            {isOwner && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline">
                  <Link to="/sell/$id" params={{ id: l.id }}><Pencil className="mr-2 h-4 w-4" />Edit</Link>
                </Button>
                <Button onClick={del} variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">Description</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {l.description || "No description provided."}
            </p>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
