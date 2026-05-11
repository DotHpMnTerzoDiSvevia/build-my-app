import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

const SUGGESTIONS = ["Is this still available?", "Could you ship it?", "Can you do a small discount?"];

function ChatRoom() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [other, setOther] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
      if (!c) return;
      const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
      const { data: p } = await supabase
        .from("profiles")
        .select("username,avatar_url")
        .eq("id", otherId)
        .maybeSingle();
      setOther(p);
      const { data: m } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at");
      setMsgs(m ?? []);
    })();

    const ch = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (body?: string, imageUrl?: string) => {
    if (!user) return;
    const content = body ?? text;
    if (!content.trim() && !imageUrl) return;
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      body: content || null,
      image_url: imageUrl || null,
    });
    if (error) toast.error(error.message);
  };

  const onUpload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
    send("", url);
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col rounded-xl border">
        <header className="flex items-center gap-3 border-b p-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
            {other?.avatar_url && <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="font-semibold">@{other?.username ?? "user"}</div>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {msgs.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.image_url && (
                    <img src={m.image_url} alt="" className="mb-1 rounded-md max-h-60" />
                  )}
                  {m.body}
                  <div className={cn("mt-1 text-[10px] opacity-60", mine ? "text-right" : "")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t p-2">
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border px-3 py-1 text-xs hover:bg-accent/10"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files && onUpload(e.target.files[0])}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
