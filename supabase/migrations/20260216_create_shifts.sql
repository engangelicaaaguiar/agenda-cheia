create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  hospital_name text not null,
  hospital_address text,
  checkin_instructions text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  value numeric(10,2) not null default 0,
  status text not null check (status in ('OPEN', 'CONFIRMED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shifts_doctor_id_start_time_idx
  on public.shifts (doctor_id, start_time desc);

alter table public.shifts enable row level security;

-- Medico autenticado so enxerga os proprios plantoes.
drop policy if exists "Doctors can view own shifts" on public.shifts;
create policy "Doctors can view own shifts"
  on public.shifts
  for select
  using (auth.uid() = doctor_id);

-- Medico autenticado so altera os proprios plantoes.
drop policy if exists "Doctors can modify own shifts" on public.shifts;
create policy "Doctors can modify own shifts"
  on public.shifts
  for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);
