import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { MessageSquare, Camera } from "lucide-react";

export const Route = createFileRoute("/chat/")({ component: ChatList });

type Convo = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  updated_at: string;
  other?: { id: string; username: string | null; avatar_url: string | null };
  listing?: { title: string } | null;
  last?: { body: string | null; image_url: string | null; created_at: string } | null;
};

function ChatList() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [convos, setConvos] = useState<Convo[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      const list = data ?? [];
      const otherIds = list.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id));
      const listingIds = list.map((c) => c.listing_id).filter(Boolean) as string[];
      const [profiles, listings, messages] = await Promise.all([
        supabase.from("profiles").select("id,username,avatar_url").in("id", otherIds),
        listingIds.length
          ? supabase.from("listings").select("id,title").in("id", listingIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        supabase
          .from("messages")
          .select("conversation_id,body,image_url,created_at")
          .in("conversation_id", list.map((c) => c.id))
          .order("created_at", { ascending: false }),
      ]);
      const lastMap = new Map<string, Convo["last"]>();
      messages.data?.forEach((m) => {
        if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
      });
      setConvos(
        list.map((c) => ({
          ...c,
          other: profiles.data?.find((p) => p.id === (c.buyer_id === user.id ? c.seller_id : c.buyer_id)),
          listing: listings.data?.find((l) => l.id === c.listing_id) ?? null,
          last: lastMap.get(c.id) ?? null,
        })),
      );
    })();
  }, [user]);

  if (!user) return null;

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>
      {convos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No conversations yet. Open a listing and tap "Chat seller".
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {convos.map((c) => (
            <li key={c.id}>
              <Link
                to="/chat/$id"
                params={{ id: c.id }}
                className="flex items-center gap-3 p-3 hover:bg-accent/5"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                  {c.other?.avatar_url && (
                    <img src={c.other.avatar_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">@{c.other?.username ?? "user"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.last && new Date(c.last.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.listing?.title ? `Re: ${c.listing.title} — ` : ""}
                    {c.last?.body || (c.last?.image_url ? <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" /> Image</span> : "New conversation")}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
