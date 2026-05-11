
-- Promote users (no-op if not yet signed up)
do $$
declare
  uid_admin uuid;
  uid_emp uuid;
begin
  select id into uid_admin from auth.users where email = 'nicolatamascellipg@gmail.com' limit 1;
  if uid_admin is not null then
    insert into public.user_roles (user_id, role) values (uid_admin, 'admin')
      on conflict (user_id, role) do nothing;
  end if;

  select id into uid_emp from auth.users where email = 'luca.cavallini@iticopernico.it' limit 1;
  if uid_emp is not null then
    insert into public.user_roles (user_id, role) values (uid_emp, 'employee')
      on conflict (user_id, role) do nothing;
  end if;
end $$;

-- Trigger on signup so future logins auto-promote
create or replace function public.auto_promote_known_emails()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email = 'nicolatamascellipg@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  elsif new.email = 'luca.cavallini@iticopernico.it' then
    insert into public.user_roles (user_id, role) values (new.id, 'employee')
      on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists auto_promote_known_emails_trg on auth.users;
create trigger auto_promote_known_emails_trg
  after insert on auth.users
  for each row execute function public.auto_promote_known_emails();

-- Realtime for chat
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- Touch conversation on new message
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists touch_convo_trg on public.messages;
create trigger touch_convo_trg after insert on public.messages
  for each row execute function public.touch_conversation();

-- Notify on new message
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  sender_name text;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
    into recipient from public.conversations c where c.id = new.conversation_id;
  select coalesce(username, 'Someone') into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (recipient, 'message', 'New message from @' || sender_name,
          coalesce(left(new.body, 80), '📷 Image'),
          '/chat/' || new.conversation_id);
  return new;
end $$;
drop trigger if exists notify_msg_trg on public.messages;
create trigger notify_msg_trg after insert on public.messages
  for each row execute function public.notify_new_message();

-- Auto-mark classified as sold when ordered
create or replace function public.mark_classified_sold()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'classified' and new.listing_id is not null then
    update public.listings set status = 'sold' where id = new.listing_id;
  end if;
  return new;
end $$;
drop trigger if exists mark_sold_trg on public.order_items;
create trigger mark_sold_trg after insert on public.order_items
  for each row execute function public.mark_classified_sold();
