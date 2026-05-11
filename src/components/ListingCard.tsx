import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { formatPrice, CONDITION_LABELS } from "@/lib/format";
import { Heart } from "lucide-react";

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

  return (
    <Link
      to="/listing/$id"
      params={{ id: l.id }}
      className="group block overflow-hidden rounded-xl border bg-card transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={l.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Heart className="h-8 w-8 opacity-30" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge variant={l.type === "new" ? "default" : "secondary"} className="text-[10px]">
            {l.type === "new" ? "New" : "Classified"}
          </Badge>
          {l.featured && <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500">Featured</Badge>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-md bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
              SOLD OUT
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="line-clamp-1 text-sm font-medium">{l.title}</div>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">{formatPrice(l.price)}</div>
          {l.condition && (
            <span className="text-xs text-muted-foreground">{CONDITION_LABELS[l.condition]}</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{l.code}</div>
      </div>
    </Link>
  );
}
