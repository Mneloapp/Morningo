create extension if not exists "pgcrypto";

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

alter table if exists public.daily_briefs
  add column if not exists id uuid default gen_random_uuid();

alter table if exists public.daily_briefs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.daily_briefs
  add column if not exists focus_today text[] default '{}';

alter table if exists public.daily_briefs
  add column if not exists can_wait text[] default '{}';

alter table if exists public.daily_briefs
  add column if not exists risks text[] default '{}';

alter table if exists public.daily_briefs
  add column if not exists suggested_next_action text;

alter table if exists public.daily_briefs
  add column if not exists created_at timestamptz default now();

alter table if exists public.daily_briefs
  add column if not exists updated_at timestamptz default now();

update public.daily_briefs
set
  id = coalesce(id, gen_random_uuid()),
  focus_today = coalesce(focus_today, '{}'),
  can_wait = coalesce(can_wait, '{}'),
  risks = coalesce(risks, '{}'),
  suggested_next_action = coalesce(nullif(suggested_next_action, ''), 'Review your inbox and choose the next action'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where id is null
  or focus_today is null
  or can_wait is null
  or risks is null
  or suggested_next_action is null
  or suggested_next_action = ''
  or created_at is null
  or updated_at is null;

delete from public.daily_briefs
where user_id is null;

alter table public.daily_briefs
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column focus_today set default '{}',
  alter column focus_today set not null,
  alter column can_wait set default '{}',
  alter column can_wait set not null,
  alter column risks set default '{}',
  alter column risks set not null,
  alter column suggested_next_action set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_briefs_pkey'
      and conrelid = 'public.daily_briefs'::regclass
  ) then
    alter table public.daily_briefs add constraint daily_briefs_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_briefs_user_id_fkey'
      and conrelid = 'public.daily_briefs'::regclass
  ) then
    alter table public.daily_briefs
      add constraint daily_briefs_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

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

drop trigger if exists set_daily_briefs_updated_at on public.daily_briefs;

create trigger set_daily_briefs_updated_at
before update on public.daily_briefs
for each row
execute function public.set_updated_at();

alter table public.daily_briefs enable row level security;

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
