alter table if exists public.inbox_items
  add column if not exists status text,
  add column if not exists priority text,
  add column if not exists category text,
  add column if not exists suggested_next_action text,
  add column if not exists assistant_reason text,
  add column if not exists calendar_starts_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.inbox_items
set
  status = coalesce(status, 'planned'),
  priority = coalesce(priority, 'medium'),
  category = coalesce(category, 'general')
where status is null
  or priority is null
  or category is null;

alter table if exists public.inbox_items
  alter column status set default 'planned',
  alter column status set not null,
  alter column priority set default 'medium',
  alter column priority set not null,
  alter column category set default 'general',
  alter column category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_status_check'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items
      add constraint inbox_items_status_check check (status in ('planned', 'done'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_priority_check'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items
      add constraint inbox_items_priority_check check (priority in ('low', 'medium', 'high'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_items_category_check'
      and conrelid = 'public.inbox_items'::regclass
  ) then
    alter table public.inbox_items
      add constraint inbox_items_category_check check (
        category in ('general', 'meeting', 'follow_up', 'finance', 'legal', 'project', 'personal')
      );
  end if;
end;
$$;

create index if not exists inbox_items_user_status_scheduled_created_idx
  on public.inbox_items(user_id, status, scheduled_for, created_at desc);
