create extension if not exists "pgcrypto";

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.inbox_items
  add column if not exists id uuid default gen_random_uuid();

alter table if exists public.inbox_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.inbox_items
  add column if not exists title text;

alter table if exists public.inbox_items
  add column if not exists created_at timestamptz default now();

alter table if exists public.inbox_items
  add column if not exists updated_at timestamptz default now();

update public.inbox_items
set
  id = coalesce(id, gen_random_uuid()),
  title = coalesce(nullif(title, ''), 'Untitled item'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where id is null
  or title is null
  or title = ''
  or created_at is null
  or updated_at is null;

delete from public.inbox_items
where user_id is null;

alter table public.inbox_items
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column title set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_pkey'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items add constraint inbox_items_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_user_id_fkey'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items
      add constraint inbox_items_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_title_length_check'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items
      add constraint inbox_items_title_length_check check (char_length(title) <= 500);
  end if;
end;
$$;

create index if not exists inbox_items_user_created_idx
  on public.inbox_items(user_id, created_at desc);

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

alter table public.inbox_items enable row level security;

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
