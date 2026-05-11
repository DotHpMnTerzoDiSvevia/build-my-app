import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/staff/products")({ component: StaffProductsPage });

function StaffProductsPage() {
  const { user, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    if (!loading && (!user || !isStaff)) navigate({ to: "/" });
  }, [user, isStaff, loading, navigate]);

  const load = () => {
    supabase.from("listings").select("*").eq("type", "new").order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  };
  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("listings").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  if (!isStaff) return null;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New product management</h1>
        <Button onClick={() => setEditing({})}>Add product</Button>
      </div>

      {editing && (
        <ProductForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          userId={user!.id}
        />
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Code / SKU</th>
              <th className="p-3">Title</th>
              <th className="p-3">Price</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Featured</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-mono text-xs">{p.code}<br /><span className="text-muted-foreground">{p.sku}</span></td>
                <td className="p-3">{p.title}</td>
                <td className="p-3">${p.price}</td>
                <td className="p-3">{p.quantity}</td>
                <td className="p-3">{p.featured ? "★" : "—"}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td className="p-6 text-center text-muted-foreground" colSpan={7}>No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

function ProductForm({ initial, onClose, onSaved, userId }: any) {
  const [cats, setCats] = useState<any[]>([]);
  const [f, setF] = useState({
    title: initial.title ?? "",
    description: initial.description ?? "",
    price: initial.price?.toString() ?? "",
    sku: initial.sku ?? "",
    quantity: initial.quantity?.toString() ?? "1",
    featured: initial.featured ?? false,
    category_id: initial.category_id ?? "",
    images: (initial.images ?? []) as string[],
    status: initial.status ?? "active",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id,name").order("name").then(({ data }) => setCats(data ?? []));
  }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    if (f.images.length + files.length > 5) return toast.error("Max 5 images.");
    const uploads = await Promise.all(Array.from(files).map(async (file) => {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("listings").upload(path, file);
      if (error) { toast.error(error.message); return null; }
      return supabase.storage.from("listings").getPublicUrl(path).data.publicUrl;
    }));
    setF((p) => ({ ...p, images: [...p.images, ...uploads.filter(Boolean) as string[]] }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      type: "new" as const,
      seller_id: userId,
      title: f.title,
      description: f.description,
      price: parseFloat(f.price),
      sku: f.sku || null,
      quantity: parseInt(f.quantity || "0", 10),
      featured: f.featured,
      category_id: f.category_id || null,
      images: f.images,
      status: parseInt(f.quantity || "0", 10) === 0 ? "sold" : "active" as any,
    };
    const { error } = initial.id
      ? await supabase.from("listings").update(payload).eq("id", initial.id)
      : await supabase.from("listings").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="mb-6 rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{initial.id ? "Edit product" : "New product"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Photos ({f.images.length}/5)</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {f.images.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md border">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setF((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))} className="absolute right-1 top-1 rounded-full bg-background/80 p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {f.images.length < 5 && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-accent">
                <Upload className="h-5 w-5" />
                <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
              </label>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="mb-1.5 block">Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div className="col-span-2"><Label className="mb-1.5 block">Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">SKU</Label><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">Price ($)</Label><Input type="number" step="0.01" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></div>
          <div><Label className="mb-1.5 block">Quantity</Label><Input type="number" min={0} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} required /></div>
          <div>
            <Label className="mb-1.5 block">Category</Label>
            <Select value={f.category_id} onValueChange={(v) => setF({ ...f, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} id="feat" />
            <Label htmlFor="feat">Featured product</Label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
