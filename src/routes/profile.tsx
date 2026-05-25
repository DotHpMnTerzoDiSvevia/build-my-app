import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Camera, Heart, Package, ShoppingBag, Bell, MessageSquare,
  Settings, ChevronRight, Star, Eye, Tag, TrendingUp,
  Shield, Users, ClipboardList, Cpu, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const MENU_ITEMS = [
  { icon: Package, label: "My Listings", to: "/my-listings", desc: "Manage your ads" },
  { icon: ShoppingBag, label: "My Orders", to: "/orders", desc: "Purchase history" },
  { icon: Heart, label: "Wishlist", to: "/wishlist", desc: "Saved items" },
  { icon: MessageSquare, label: "Messages", to: "/chat", desc: "Your conversations" },
  { icon: Bell, label: "Notifications", to: "/notifications", desc: "Activity alerts" },
  { icon: Settings, label: "Settings", to: "/profile", desc: "Account & preferences" },
];

const STAFF_ITEMS = [
  { icon: Package, label: "Manage Products", to: "/staff/products", search: undefined as any },
  { icon: Users, label: "User Management", to: "/admin", search: { tab: "users" } },
  { icon: ClipboardList, label: "Moderation Queue", to: "/admin", search: { tab: "moderation" } },
  { icon: BarChart2, label: "AI Insights", to: "/admin", search: { tab: "ai" } },
];

function ProfilePage() {
  const { user, loading, roles, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState({ username: "", full_name: "", address: "", bio: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    // Use SECURITY DEFINER RPC so the owner can read their own address
    // (the address column is no longer publicly selectable).
    supabase.rpc("get_my_profile").then(({ data }: any) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setP({
        username: row.username ?? "",
        full_name: row.full_name ?? "",
        address: row.address ?? "",
        bio: row.bio ?? "",
        avatar_url: row.avatar_url ?? "",
      });
    });
  }, [user]);


  const onAvatar = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setP((prev) => ({ ...prev, avatar_url: url }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(p).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditing(false);
  };

  if (!user) return null;

  const initials = (p.full_name || p.username || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl">
        {/* Profile header */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-muted ring-4 ring-background shadow-lg">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-primary text-2xl font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>
            <label
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow hover:bg-accent/90 transition"
              aria-label="Change avatar"
            >
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files && onAvatar(e.target.files[0])} />
            </label>
          </div>

          <h1 className="text-xl font-bold">{p.full_name || p.username || "Your Profile"}</h1>
          {p.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}

          {/* Rating */}
          <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
            {[1,2,3,4,5].map((n) => (
              <Star key={n} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1 text-xs">5.0</span>
          </div>

          {/* Role badges */}
          <div className="mt-2 flex gap-2">
            <span className="rounded-full border border-border/60 bg-muted px-2.5 py-0.5 text-[11px] font-medium">
              {roles[0] ?? "user"}
            </span>
            {isStaff && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                Staff
              </span>
            )}
            {isAdmin && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                Admin
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            className="mt-4 rounded-full px-5"
          >
            {editing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: Eye, label: "Views", value: "—" },
            { icon: Tag, label: "Active Ads", value: "—" },
            { icon: TrendingUp, label: "Sales", value: "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3 px-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={save} className="mb-6 space-y-4 rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="font-semibold">Edit your info</h2>
            <div><Label className="mb-1.5 block text-xs">Username</Label><Input value={p.username} onChange={(e) => setP({ ...p, username: e.target.value })} /></div>
            <div><Label className="mb-1.5 block text-xs">Full name</Label><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
            <div><Label className="mb-1.5 block text-xs">Address</Label><Input value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} /></div>
            <div><Label className="mb-1.5 block text-xs">Bio</Label><Textarea rows={3} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></div>
            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </form>
        )}

        {/* Menu list */}
        <nav className="space-y-1.5">
          {MENU_ITEMS.map(({ icon: Icon, label, to, desc }) => (
            <Link
              key={to + label}
              to={to as any}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 hover:border-accent/40 hover:bg-accent/5 transition group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-accent/10 transition">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent transition" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-accent transition" />
            </Link>
          ))}
        </nav>

        {/* Staff/Admin section */}
        {(isStaff || isAdmin) && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Tools</span>
            </div>
            <nav className="space-y-1.5">
              {STAFF_ITEMS.map(({ icon: Icon, label, to }) => (
                <Link
                  key={to + label}
                  to={to as any}
                  className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 hover:border-primary/40 hover:bg-primary/10 transition group"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-semibold text-primary">{label}</span>
                  <ChevronRight className="h-4 w-4 text-primary/40 group-hover:text-primary transition" />
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* AI suggestion box for sellers */}
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Cpu className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI tip for sellers</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add more photos to your listings to get up to 3× more views. The AI assistant can help you write better descriptions too!
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
