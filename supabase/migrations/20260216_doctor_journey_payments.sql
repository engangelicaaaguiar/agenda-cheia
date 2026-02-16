create extension if not exists pgcrypto;

create table if not exists public.doctor_compliance (
  doctor_id uuid primary key references auth.users(id) on delete cascade,
  crm_number text,
  crm_state varchar(2),
  rqe_number text,
  cfm_status text not null default 'PENDING',
  vault_ready boolean not null default false,
  ecpf_linked boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_compliance enable row level security;

drop policy if exists "Doctors can view own compliance" on public.doctor_compliance;
create policy "Doctors can view own compliance"
  on public.doctor_compliance
  for select
  using (auth.uid() = doctor_id);

drop policy if exists "Doctors can upsert own compliance" on public.doctor_compliance;
create policy "Doctors can upsert own compliance"
  on public.doctor_compliance
  for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

create table if not exists public.doctor_wallets (
  doctor_id uuid primary key references auth.users(id) on delete cascade,
  available_balance numeric(12,2) not null default 0,
  pending_balance numeric(12,2) not null default 0,
  currency char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_wallets enable row level security;

drop policy if exists "Doctors can view own wallet" on public.doctor_wallets;
create policy "Doctors can view own wallet"
  on public.doctor_wallets
  for select
  using (auth.uid() = doctor_id);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  type text not null check (type in ('CREDIT', 'DEBIT', 'PAYOUT')),
  status text not null check (status in ('PENDING', 'SETTLED', 'FAILED')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  available_on date,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_doctor_idx
  on public.wallet_transactions (doctor_id, created_at desc);

alter table public.wallet_transactions enable row level security;

drop policy if exists "Doctors can view own transactions" on public.wallet_transactions;
create policy "Doctors can view own transactions"
  on public.wallet_transactions
  for select
  using (auth.uid() = doctor_id);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED')),
  payout_eta date,
  bank_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_requests_doctor_idx
  on public.payout_requests (doctor_id, created_at desc);

alter table public.payout_requests enable row level security;

drop policy if exists "Doctors can view own payouts" on public.payout_requests;
create policy "Doctors can view own payouts"
  on public.payout_requests
  for select
  using (auth.uid() = doctor_id);

drop policy if exists "Doctors can create own payouts" on public.payout_requests;
create policy "Doctors can create own payouts"
  on public.payout_requests
  for insert
  with check (auth.uid() = doctor_id);
