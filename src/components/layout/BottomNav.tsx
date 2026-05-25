import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Heart, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Search", icon: Search },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to} className="relative">
              {/* Active top indicator */}
              {active && (
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-accent dark:bg-accent-foreground" />
              )}
              <Link
                to={it.to as any}
                className="flex flex-col items-center justify-center gap-1 py-2 h-14"
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    active ? "text-accent dark:text-accent-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    active ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
