import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  Plus,
  Sun,
  Moon,
  User as UserIcon,
  LogOut,
  Bell,
  Package,
  Shield,
  MessageSquare,
  Menu,
  Tag,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { user, isStaff, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(0);
  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id,name,slug").order("name").then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return setUnread(0);
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate({ to: "/search", search: { q: trimmed } });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-accent text-accent-foreground shadow-sm">
      {/* ── MOBILE HEADER ── */}
      <div className="flex h-14 items-center justify-between px-4 md:hidden">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" aria-label="TheVault home">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-base font-bold tracking-tight text-white">TheVault</span>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user && (
            <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9 text-white hover:bg-white/10 hover:text-white">
              <Link to="/notifications">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-accent" />
                )}
              </Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground font-normal">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/orders">My orders</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/my-listings">My listings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/chat">Messages</Link></DropdownMenuItem>
                {isStaff && (
                  <DropdownMenuItem asChild>
                    <Link to="/staff/products"><Package className="mr-2 h-4 w-4" />Manage products</Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-8 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── DESKTOP HEADER ── */}
      <div className="mx-auto hidden h-16 max-w-7xl items-center gap-4 px-4 md:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu" className="text-white hover:bg-white/10 hover:text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Browse</DropdownMenuLabel>
            <DropdownMenuItem asChild><Link to="/browse"><Sparkles className="mr-2 h-4 w-4" />All listings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/browse" search={{ type: "new" }}><Package className="mr-2 h-4 w-4" />New products</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/browse" search={{ type: "classified" }}><Tag className="mr-2 h-4 w-4" />Used ads</Link></DropdownMenuItem>
            {cats.length > 0 && <DropdownMenuSeparator />}
            {cats.length > 0 && <DropdownMenuLabel>Categories</DropdownMenuLabel>}
            {cats.map((c) => (
              <DropdownMenuItem key={c.id} asChild>
                <Link to="/browse" search={{ category: c.slug }}>{c.name}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-white hover:text-primary transition-colors">
          <Package className="h-7 w-7 text-primary" />
          <span className="hidden sm:inline text-lg">TheVault</span>
        </Link>

        <form onSubmit={onSubmit} className="relative flex-1 max-w-xl flex h-10">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, ads, users, or PROD-12345…"
            className="rounded-r-none border-none bg-background text-foreground focus-visible:ring-0 h-full"
          />
          <Button type="submit" variant="default" className="rounded-l-none bg-primary text-primary-foreground hover:bg-primary/90 h-full px-5">
            <Search className="h-5 w-5" />
          </Button>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="text-white hover:bg-white/10 hover:text-white">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user && (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative text-white hover:bg-white/10 hover:text-white">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Messages" className="hidden md:inline-flex text-white hover:bg-white/10 hover:text-white">
                <Link to="/chat"><MessageSquare className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Wishlist" className="hidden md:inline-flex text-white hover:bg-white/10 hover:text-white">
                <Link to="/wishlist"><Heart className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Cart" className="hidden md:inline-flex text-white hover:bg-white/10 hover:text-white">
                <Link to="/cart"><ShoppingCart className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex ml-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium">
                <Link to="/sell"><Plus className="mr-1 h-4 w-4" />Sell</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white ml-1">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders">My orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/my-listings">My listings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/chat">Messages</Link></DropdownMenuItem>
                  {isStaff && (
                    <DropdownMenuItem asChild>
                      <Link to="/staff/products"><Package className="mr-2 h-4 w-4" />Manage products</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!user && (
            <Button asChild size="sm" className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
