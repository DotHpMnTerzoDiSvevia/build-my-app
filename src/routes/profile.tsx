import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState({ username: "", full_name: "", address: "", bio: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setP({
        username: data.username ?? "",
        full_name: data.full_name ?? "",
        address: data.address ?? "",
        bio: data.bio ?? "",
        avatar_url: data.avatar_url ?? "",
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
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Roles: {roles.join(", ") || "user"}
        </p>
        <form onSubmit={save} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
              {p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <label className="cursor-pointer text-sm text-primary hover:underline">
              Change avatar
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files && onAvatar(e.target.files[0])} />
            </label>
          </div>
          <div><Label className="mb-1.5 block">Username</Label><Input value={p.username} onChange={(e) => setP({ ...p, username: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">Full name</Label><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">Address</Label><Input value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">Bio</Label><Textarea rows={3} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></div>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </form>
      </div>
    </AppLayout>
  );
}
