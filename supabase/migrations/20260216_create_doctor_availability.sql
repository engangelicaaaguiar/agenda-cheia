create extension if not exists pgcrypto;

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_recurring boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index if not exists idx_doctor_availability_doctor_id
  on public.doctor_availability(doctor_id);

create index if not exists idx_doctor_availability_day_of_week
  on public.doctor_availability(day_of_week);

create or replace function public.set_doctor_availability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_doctor_availability_updated_at on public.doctor_availability;
create trigger trg_doctor_availability_updated_at
before update on public.doctor_availability
for each row
execute procedure public.set_doctor_availability_updated_at();

alter table public.doctor_availability enable row level security;

drop policy if exists doctor_availability_select_own on public.doctor_availability;
create policy doctor_availability_select_own
on public.doctor_availability
for select
to authenticated
using (auth.uid() = doctor_id);

drop policy if exists doctor_availability_insert_own on public.doctor_availability;
create policy doctor_availability_insert_own
on public.doctor_availability
for insert
to authenticated
with check (auth.uid() = doctor_id);

drop policy if exists doctor_availability_update_own on public.doctor_availability;
create policy doctor_availability_update_own
on public.doctor_availability
for update
to authenticated
using (auth.uid() = doctor_id)
with check (auth.uid() = doctor_id);

drop policy if exists doctor_availability_delete_own on public.doctor_availability;
create policy doctor_availability_delete_own
on public.doctor_availability
for delete
to authenticated
using (auth.uid() = doctor_id);

create or replace function public.replace_doctor_availability(p_slots jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.doctor_availability where doctor_id = v_user_id;

  insert into public.doctor_availability (doctor_id, day_of_week, start_time, end_time, is_recurring)
  select
    v_user_id,
    (slot->>'day_of_week')::int,
    (slot->>'start_time')::time,
    (slot->>'end_time')::time,
    coalesce((slot->>'is_recurring')::boolean, true)
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) as slot;
end;
$$;
