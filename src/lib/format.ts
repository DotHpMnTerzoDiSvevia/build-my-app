export function formatPrice(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export const CONDITION_LABELS: Record<string, string> = {
  new_with_tags: "New with tags",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
};
