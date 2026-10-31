-- KAS PEMUDA-PEMUDI RT 08
-- Jalankan seluruh script ini di Supabase > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'warga' check (role in ('admin','warga')),
  created_at timestamptz not null default now()
);

create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete restrict,
  paid_at date not null default current_date,
  year integer not null default extract(year from current_date)::integer,
  amount integer not null check (amount > 0),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.residents enable row level security;
alter table public.payments enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read residents" on public.residents;
create policy "authenticated read residents" on public.residents for select to authenticated using (true);
drop policy if exists "admin insert residents" on public.residents;
create policy "admin insert residents" on public.residents for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update residents" on public.residents;
create policy "admin update residents" on public.residents for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete residents" on public.residents;
create policy "admin delete residents" on public.residents for delete to authenticated using (public.is_admin());

drop policy if exists "authenticated read payments" on public.payments;
create policy "authenticated read payments" on public.payments for select to authenticated using (true);
drop policy if exists "admin insert payments" on public.payments;
create policy "admin insert payments" on public.payments for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update payments" on public.payments;
create policy "admin update payments" on public.payments for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete payments" on public.payments;
create policy "admin delete payments" on public.payments for delete to authenticated using (public.is_admin());

-- LANGKAH ADMIN PERTAMA:
-- 1. Buat akun admin melalui Supabase > Authentication > Users > Add user.
-- 2. Salin UUID akun tersebut.
-- 3. Ganti UUID di bawah, lalu jalankan perintah INSERT ini.
-- Jangan berikan service_role key kepada siapa pun.
-- insert into public.profiles (id, full_name, role)
-- values ('GANTI-DENGAN-UUID-AKUN-ADMIN', 'Admin RT 08', 'admin')
-- on conflict (id) do update set role='admin', full_name='Admin RT 08';

-- Untuk akun warga: buat user melalui Authentication > Users,
-- lalu daftarkan profilnya sebagai role 'warga'.
-- insert into public.profiles (id, full_name, role)
-- values ('UUID-AKUN-WARGA', 'Nama Warga', 'warga')
-- on conflict (id) do update set role='warga', full_name=excluded.full_name;

-- Nominal iuran aplikasi saat ini Rp50.000 per warga per tahun.
