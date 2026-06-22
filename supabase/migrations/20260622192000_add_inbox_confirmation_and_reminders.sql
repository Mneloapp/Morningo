alter table if exists public.inbox_items
  add column if not exists reminder_at timestamptz,
  add column if not exists confirmed_at timestamptz;

update public.inbox_items
set reminder_at = coalesce(reminder_at, scheduled_for::timestamptz + interval '9 hours')
where reminder_at is null;

alter table if exists public.inbox_items
  drop constraint if exists inbox_items_status_check;

alter table if exists public.inbox_items
  add constraint inbox_items_status_check check (status in ('planned', 'confirmed', 'done'));

create index if not exists inbox_items_user_reminder_status_idx
  on public.inbox_items(user_id, reminder_at, status);
