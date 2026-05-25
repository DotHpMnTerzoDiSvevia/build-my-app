import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { X, Upload } from "lucide-react";

export const Route = createFileRoute("/sell")({ component: SellPage });

function SellPage() {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState<"classified" | "new">("classified");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<string>("good");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("categories").select("id,name").order("name").then(({ data }) => setCats(data ?? []));
  }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    if (images.length + files.length > 5) return toast.error("Max 5 images.");
    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("listings").upload(path, file);
        if (error) { toast.error(error.message); return null; }
        return supabase.storage.from("listings").getPublicUrl(path).data.publicUrl;
      }),
    );
    setImages((prev) => [...prev, ...uploads.filter(Boolean) as string[]]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !price) return toast.error("Title and price are required.");
    setBusy(true);
    const isNew = isStaff && type === "new";
    const qty = isNew ? Math.max(0, parseInt(quantity || "0", 10)) : 1;
    const { data, error } = await supabase
      .from("listings")
      .insert({
        type: isNew ? "new" : "classified",
        seller_id: user.id,
        title, description,
        price: parseFloat(price),
        category_id: categoryId || null,
        condition: isNew ? null : (condition as never),
        sku: isNew ? (sku || null) : null,
        quantity: qty,
        images,
        status: isNew && qty === 0 ? ("sold" as never) : ("active" as never),
      })
      .select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Product published!" : "Ad posted!");
    navigate({ to: "/listing/$id", params: { id: data.id } });
  };

  if (loading || !user) return <AppLayout><div className="py-20 text-center text-muted-foreground">…</div></AppLayout>;
  const isNewMode = isStaff && type === "new";

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Post a used ad</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sell something you no longer need. Up to 5 photos.</p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label className="mb-1.5 block">Photos ({images.length}/5)</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent">
                  <Upload className="h-5 w-5" />
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
                </label>
              )}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={140} />
          </div>
          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Price ($)</Label>
              <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1.5 block">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
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
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post ad"}</Button>
            <Button asChild variant="outline" type="button"><Link to="/">Cancel</Link></Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
