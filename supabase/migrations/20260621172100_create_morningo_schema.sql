create extension if not exists "pgcrypto";

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_today text[] not null default '{}',
  can_wait text[] not null default '{}',
  risks text[] not null default '{}',
  suggested_next_action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inbox_items_user_created_idx
  on public.inbox_items(user_id, created_at desc);

create index if not exists daily_briefs_user_created_idx
  on public.daily_briefs(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inbox_items_updated_at on public.inbox_items;
create trigger set_inbox_items_updated_at
before update on public.inbox_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_daily_briefs_updated_at on public.daily_briefs;
create trigger set_daily_briefs_updated_at
before update on public.daily_briefs
for each row
execute function public.set_updated_at();

alter table public.inbox_items enable row level security;
alter table public.daily_briefs enable row level security;

drop policy if exists "Users can read own inbox items" on public.inbox_items;
create policy "Users can read own inbox items"
on public.inbox_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own inbox items" on public.inbox_items;
create policy "Users can create own inbox items"
on public.inbox_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own inbox items" on public.inbox_items;
create policy "Users can update own inbox items"
on public.inbox_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own inbox items" on public.inbox_items;
create policy "Users can delete own inbox items"
on public.inbox_items
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own daily briefs" on public.daily_briefs;
create policy "Users can read own daily briefs"
on public.daily_briefs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own daily briefs" on public.daily_briefs;
create policy "Users can create own daily briefs"
on public.daily_briefs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily briefs" on public.daily_briefs;
create policy "Users can delete own daily briefs"
on public.daily_briefs
for delete
to authenticated
using (auth.uid() = user_id);
