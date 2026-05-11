
-- Enums
create type public.app_role as enum ('user', 'employee', 'admin');
create type public.listing_type as enum ('classified', 'new');
create type public.listing_condition as enum ('new_with_tags', 'excellent', 'good', 'fair');
create type public.listing_status as enum ('active', 'sold', 'removed', 'suspended');
create type public.order_status as enum ('confirmed', 'shipped', 'delivered', 'cancelled');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  address text,
  bio text,
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "Roles readable by everyone" on public.user_roles for select using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Admins manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "Categories readable" on public.categories for select using (true);
create policy "Staff manage categories" on public.categories for all
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'employee'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'employee'));

insert into public.categories (name, slug) values
  ('Electronics','electronics'),('Fashion','fashion'),('Home & Garden','home-garden'),
  ('Books','books'),('Toys & Games','toys-games'),('Sports','sports'),
  ('Beauty','beauty'),('Vehicles','vehicles'),('Collectibles','collectibles'),('Other','other');

-- Listings
create sequence public.listing_code_seq start 10000;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PROD-' || lpad(nextval('public.listing_code_seq')::text, 5, '0')),
  type listing_type not null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  category_id uuid references public.categories(id),
  condition listing_condition,
  sku text unique,
  quantity integer not null default 1 check (quantity >= 0),
  images text[] not null default '{}',
  featured boolean not null default false,
  status listing_status not null default 'active',
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.listings (type, status);
create index on public.listings (category_id);
create index on public.listings (seller_id);

alter table public.listings enable row level security;
create policy "Active listings viewable" on public.listings for select
  using (status = 'active' or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'employee'));
create policy "Users create own classifieds" on public.listings for insert
  with check (auth.uid() = seller_id and (
    type = 'classified' or public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  ));
create policy "Sellers update own listings" on public.listings for update
  using (auth.uid() = seller_id or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'employee'));
create policy "Sellers delete own listings" on public.listings for delete
  using (auth.uid() = seller_id or public.has_role(auth.uid(), 'admin'));

-- Wishlist
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
alter table public.wishlist_items enable row level security;
create policy "Own wishlist" on public.wishlist_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cart
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
alter table public.cart_items enable row level security;
create policy "Own cart" on public.cart_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders
create sequence public.tracking_seq start 100000;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  total numeric(10,2) not null,
  shipping_address jsonb not null,
  tracking_number text not null unique default ('TRK-' || lpad(nextval('public.tracking_seq')::text, 8, '0')),
  status order_status not null default 'confirmed',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Buyer reads own orders" on public.orders for select
  using (auth.uid() = buyer_id or public.has_role(auth.uid(), 'admin'));
create policy "Buyer creates orders" on public.orders for insert with check (auth.uid() = buyer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  seller_id uuid not null,
  title text not null,
  price numeric(10,2) not null,
  quantity integer not null,
  type listing_type not null,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create policy "Order items visible to buyer or seller" on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
    or seller_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );
create policy "Buyer inserts order items" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
);

-- Restock subscriptions
create table public.restock_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
alter table public.restock_subscriptions enable row level security;
create policy "Own subs" on public.restock_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read);
alter table public.notifications enable row level security;
create policy "Own notifications read" on public.notifications for select using (auth.uid() = user_id);
create policy "Own notifications update" on public.notifications for update using (auth.uid() = user_id);

-- Reviews (scaffold)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, reviewer_id, seller_id)
);
alter table public.reviews enable row level security;
create policy "Reviews readable" on public.reviews for select using (true);
create policy "Buyer writes review" on public.reviews for insert with check (
  auth.uid() = reviewer_id and exists (
    select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()
  )
);

-- Chat (scaffold)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);
alter table public.conversations enable row level security;
create policy "Participants read convo" on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyer creates convo" on public.conversations for insert
  with check (auth.uid() = buyer_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Participants read messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
);
create policy "Participants send messages" on public.messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger listings_touch before update on public.listings for each row execute function public.touch_updated_at();

-- Restock notification trigger: when a listing's quantity goes from 0 to >0
create or replace function public.notify_restock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'new' and old.quantity = 0 and new.quantity > 0 then
    insert into public.notifications (user_id, type, title, body, link)
    select s.user_id, 'restock', 'Back in stock: ' || new.title,
           'A product you wanted is available again.',
           '/listing/' || new.id
    from public.restock_subscriptions s where s.listing_id = new.id;
    delete from public.restock_subscriptions where listing_id = new.id;
  end if;
  return new;
end;
$$;
create trigger listings_restock after update of quantity on public.listings
  for each row execute function public.notify_restock();

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('listings','listings',true),
  ('chat-images','chat-images',true)
on conflict (id) do nothing;

create policy "Avatar images public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Users update own avatar" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Listing images public read" on storage.objects for select using (bucket_id = 'listings');
create policy "Auth users upload listing images" on storage.objects for insert with check (
  bucket_id = 'listings' and auth.role() = 'authenticated' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Owners delete listing images" on storage.objects for delete using (
  bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Chat images participants read" on storage.objects for select using (bucket_id = 'chat-images');
create policy "Auth users upload chat images" on storage.objects for insert with check (
  bucket_id = 'chat-images' and auth.role() = 'authenticated'
);
