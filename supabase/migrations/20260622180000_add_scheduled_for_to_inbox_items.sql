alter table if exists public.inbox_items
  add column if not exists scheduled_for date;

update public.inbox_items
set scheduled_for = current_date
where scheduled_for is null;

alter table if exists public.inbox_items
  alter column scheduled_for set default current_date,
  alter column scheduled_for set not null;

create index if not exists inbox_items_user_scheduled_created_idx
  on public.inbox_items(user_id, scheduled_for, created_at desc);
