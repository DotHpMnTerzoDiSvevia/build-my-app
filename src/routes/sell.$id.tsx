import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/sell/$id")({ component: EditAdPage });

function EditAdPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [f, setF] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("categories").select("id,name").order("name").then(({ data }) => setCats(data ?? []));
    supabase.from("listings").select("*").eq("id", id).maybeSingle().then(({ data }) => setF(data));
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("listings").update({
      title: f.title, description: f.description, price: parseFloat(f.price),
      category_id: f.category_id || null, condition: f.condition,
    }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    navigate({ to: "/listing/$id", params: { id } });
  };

  if (!f) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit ad</h1>
        <form onSubmit={save} className="space-y-4">
          <div><Label className="mb-1.5 block">Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div><Label className="mb-1.5 block">Description</Label><Textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block">Price</Label><Input type="number" step="0.01" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></div>
            <div>
              <Label className="mb-1.5 block">Condition</Label>
              <Select value={f.condition ?? "good"} onValueChange={(v) => setF({ ...f, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_with_tags">New with tags</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Category</Label>
            <Select value={f.category_id ?? ""} onValueChange={(v) => setF({ ...f, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </div>
    </AppLayout>
  );
}
