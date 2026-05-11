import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer?: { username: string | null; avatar_url: string | null };
};

export function Reviews({ sellerId }: { sellerId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);
      const list = data ?? [];
      const ids = list.map((r) => r.reviewer_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", ids);
      setReviews(
        list.map((r) => ({ ...r, reviewer: profs?.find((p) => p.id === r.reviewer_id) })),
      );
    })();
  }, [sellerId]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Reviews</h3>
        {avg && (
          <span className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-warning text-warning" /> {avg} ({reviews.length})
          </span>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
                    {r.reviewer?.avatar_url && (
                      <img src={r.reviewer.avatar_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="text-xs font-medium">@{r.reviewer?.username}</span>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Stars({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(!onChange && "cursor-default")}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(n <= value ? "fill-warning text-warning" : "text-muted-foreground")}
          />
        </button>
      ))}
    </div>
  );
}
