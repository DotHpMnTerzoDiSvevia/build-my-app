import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const Route = createFileRoute("/u/$username")({ component: PublicProfilePage });

function PublicProfilePage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setItems([]);

    if (!username) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    // Decode the username in case it was URL-encoded
    let decodedUsername: string;
    try {
      decodedUsername = decodeURIComponent(username);
    } catch {
      decodedUsername = username;
    }

    async function fetchProfile() {
      // Use ilike for case-insensitive match
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", decodedUsername)
        .maybeSingle();

      if (cancelled) return;

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch listings for this user
      const { data: listingData } = await supabase
        .from("listings")
        .select("id,code,title,price,type,condition,quantity,images,featured")
        .eq("seller_id", profileData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setItems((listingData ?? []) as ListingCardData[]);
      setLoading(false);
    }

    fetchProfile();

    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (notFound || !profile) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-muted-foreground">User not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
          {profile.avatar_url && <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">@{profile.username}</h1>
          {profile.full_name && <div className="text-sm text-muted-foreground">{profile.full_name}</div>}
          {profile.bio && <p className="mt-1 max-w-xl text-sm">{profile.bio}</p>}
        </div>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Listings</h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No active listings.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </AppLayout>
  );
}
