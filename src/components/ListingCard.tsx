import { Link } from "@tanstack/react-router";
import { formatPrice, CONDITION_LABELS } from "@/lib/format";
import { Heart, ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  code: string;
  title: string;
  price: number | string;
  type: "classified" | "new";
  condition: string | null;
  quantity: number;
  images: string[];
  featured?: boolean;
};

export function ListingCard({ l }: { l: ListingCardData }) {
  const soldOut = l.type === "new" && l.quantity === 0;
  const img = l.images?.[0];
  const [wishlisted, setWishlisted] = useState(false);
  const isClassified = l.type === "classified";

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-card transition-colors duration-200 hover:border-accent">
      {/* Image */}
      <Link to="/listing/$id" params={{ id: l.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {img ? (
            <img
              src={img}
              alt={l.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground/30">
              <ImageOff className="h-10 w-10" />
            </div>
          )}

          {/* Type badge */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span
              className={cn(
                "inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                isClassified
                  ? "bg-accent text-accent-foreground"
                  : "bg-success text-success-foreground",
              )}
            >
              {isClassified ? "Classified" : "New"}
            </span>
            {l.featured && (
              <span className="inline-flex items-center rounded-sm bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-foreground">
                Featured
              </span>
            )}
          </div>

          {/* Sold out */}
          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-sm">
              <span className="rounded-sm bg-destructive px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-destructive-foreground shadow">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Heart wishlist */}
      <button
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => setWishlisted((v) => !v)}
        className={cn(
          "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow transition-colors duration-200",
          wishlisted ? "text-destructive" : "text-muted-foreground hover:text-destructive",
        )}
      >
        <Heart className="h-4 w-4" fill={wishlisted ? "currentColor" : "none"} strokeWidth={2} />
      </button>

      {/* Info */}
      <Link to="/listing/$id" params={{ id: l.id }} className="block p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{l.title}</p>
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div className="text-base font-bold">{formatPrice(l.price)}</div>
          {l.condition && (
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {CONDITION_LABELS[l.condition] ?? l.condition}
            </span>
          )}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground/60">{l.code}</div>
      </Link>
    </div>
  );
}
