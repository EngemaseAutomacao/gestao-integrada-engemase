-- 1) Create user_roles table and has_role() helper, migrate existing roles, and fix profiles SELECT exposure
-- Create table to store roles separately (no FK to auth.users to follow project guidelines)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Ensure RLS is enabled
alter table public.user_roles enable row level security;

-- Create a helper function to check roles without referencing profiles (avoids recursion)
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;

-- Basic RLS policies for user_roles
-- Users can see their own roles
drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles
  for select
  using (user_id = auth.uid());

-- Admins can manage roles (insert/update/delete)
drop policy if exists "Admins can manage roles (insert)" on public.user_roles;
create policy "Admins can manage roles (insert)"
  on public.user_roles
  for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage roles (update)" on public.user_roles;
create policy "Admins can manage roles (update)"
  on public.user_roles
  for update
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage roles (delete)" on public.user_roles;
create policy "Admins can manage roles (delete)"
  on public.user_roles
  for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles into user_roles (idempotent)
insert into public.user_roles (user_id, role)
select p.id, p.role
from public.profiles p
on conflict (user_id, role) do nothing;

-- 2) Keep user_roles in sync with profiles.role for backward compatibility
create or replace function public.sync_user_roles_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_roles (user_id, role)
    values (new.id, new.role)
    on conflict (user_id, role) do nothing;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      -- remove old role and insert new
      delete from public.user_roles where user_id = new.id and role = old.role;
      insert into public.user_roles (user_id, role)
      values (new.id, new.role)
      on conflict (user_id, role) do nothing;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.user_roles where user_id = old.id;
    return old;
  end if;
  return null;
end;
$$;

-- Create triggers to sync roles
-- (drop if exist first to be idempotent)
drop trigger if exists profiles_role_sync_after_insert on public.profiles;
drop trigger if exists profiles_role_sync_after_update on public.profiles;
drop trigger if exists profiles_role_sync_after_delete on public.profiles;

create trigger profiles_role_sync_after_insert
  after insert on public.profiles
  for each row execute function public.sync_user_roles_from_profiles();

create trigger profiles_role_sync_after_update
  after update of role on public.profiles
  for each row execute function public.sync_user_roles_from_profiles();

create trigger profiles_role_sync_after_delete
  after delete on public.profiles
  for each row execute function public.sync_user_roles_from_profiles();

-- 3) Fix the profiles SELECT exposure: restrict to self, allow admins all via has_role()
-- Drop overly-permissive policy
drop policy if exists "Users can view all profiles" on public.profiles;

-- Create restricted SELECT policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- Update admin policies on profiles to avoid recursive checks
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles
  for delete
  using (public.has_role(auth.uid(), 'admin'));
