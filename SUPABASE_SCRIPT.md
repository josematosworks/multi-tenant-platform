```sql
-- Enable required extension
create extension if not exists "uuid-ossp";

-- ENUM for competition visibility
create type visibility_enum as enum ('public', 'private', 'restricted');

-- TENANTS TABLE (e.g., schools)
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- USERS TABLE
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  role text check (role in ('school_admin', 'student', 'superuser')) not null,
  created_at timestamp with time zone default now()
);

-- COMPETITIONS TABLE
create table public.competitions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  visibility visibility_enum not null default 'private',
  tenant_id uuid references tenants(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- COMPETITION_ALLOWED_SCHOOLS TABLE
create table public.competition_allowed_schools (
  competition_id uuid references competitions(id) on delete cascade,
  school_id uuid references tenants(id) on delete cascade,
  primary key (competition_id, school_id)
);

-- Enable RLS on all tables
alter table tenants enable row level security;
alter table users enable row level security;
alter table competitions enable row level security;
alter table competition_allowed_schools enable row level security;

-- Create a helper function to get the current user's role
create or replace function get_user_role()
returns text
language sql security definer
as $$
  select role from users where id = auth.uid();
$$;

-- Create a helper function to get the current user's tenant ID
create or replace function get_user_tenant_id()
returns uuid
language sql security definer
as $$
  select tenant_id from users where id = auth.uid();
$$;

-- TENANTS POLICIES --

-- Superusers can view all tenants (view_all_tenants permission)
create policy "Superusers can view all tenants"
on tenants
for select
using (get_user_role() = 'superuser');

-- Users can view their own tenant
create policy "Users can view their own tenant"
on tenants
for select
using (id = get_user_tenant_id());

-- Superusers can manage tenants (manage_tenants permission)
create policy "Superusers can manage tenants"
on tenants
for all
using (get_user_role() = 'superuser');

-- USERS POLICIES --

-- Users can view their own profile (view_own_profile permission)
create policy "Users can view their own profile"
on users
for select
using (id = auth.uid());

-- School admins can view users in their tenant (for invite_users permission)
create policy "School admins can view users in their tenant"
on users
for select
using (
  get_user_role() = 'school_admin' AND
  tenant_id = get_user_tenant_id()
);

-- School admins can create users in their tenant (invite_users permission)
create policy "School admins can create users in their tenant"
on users
for insert
with check (
  get_user_role() = 'school_admin' AND
  tenant_id = get_user_tenant_id() AND
  role != 'superuser'
);

-- Superusers can view all users (view_all_users permission)
create policy "Superusers can view all users"
on users
for select
using (get_user_role() = 'superuser');

-- Superusers can manage all users
create policy "Superusers can manage all users"
on users
for all
using (get_user_role() = 'superuser');

-- COMPETITIONS POLICIES --

-- Students can view public competitions (view_public_competitions permission)
create policy "Students can view public competitions"
on competitions
for select
using (
  visibility = 'public'
);

-- Students can view competitions from their school (view_school_competitions permission)
create policy "Students can view competitions from their school"
on competitions
for select
using (
  tenant_id = get_user_tenant_id()
);

-- School admins can view all tenant competitions (view_tenant_competitions permission)
create policy "School admins can view all tenant competitions"
on competitions
for select
using (
  get_user_role() = 'school_admin' AND
  tenant_id = get_user_tenant_id()
);

-- School admins can manage competitions (manage_competitions permission)
create policy "School admins can manage competitions"
on competitions
for all
using (
  get_user_role() = 'school_admin' AND
  tenant_id = get_user_tenant_id()
);

-- Users can view restricted competitions allowed to their school
create policy "Users can view restricted competitions allowed to their school"
on competitions
for select
using (
  visibility = 'restricted' AND
  exists (
    select 1 from competition_allowed_schools cas
    where cas.competition_id = competitions.id
    and cas.school_id = get_user_tenant_id()
  )
);

-- Superusers can view all competitions (view_all_competitions permission)
create policy "Superusers can view all competitions"
on competitions
for select
using (get_user_role() = 'superuser');

-- Superusers can manage all competitions
create policy "Superusers can manage all competitions"
on competitions
for all
using (get_user_role() = 'superuser');

-- COMPETITION_ALLOWED_SCHOOLS POLICIES --

-- School admins can manage which schools can access their restricted competitions
create policy "School admins can manage competition visibility"
on competition_allowed_schools
for all
using (
  get_user_role() = 'school_admin' AND
  exists (
    select 1 from competitions c
    where c.id = competition_id
    and c.tenant_id = get_user_tenant_id()
  )
);

-- School admins and students can view which competitions are accessible to their school
create policy "Users can view which competitions are accessible to their school"
on competition_allowed_schools
for select
using (school_id = get_user_tenant_id());

-- Superusers can manage all competition allowed schools
create policy "Superusers can manage all competition allowed schools"
on competition_allowed_schools
for all
using (get_user_role() = 'superuser');

-- Create a function to simplify setting allowed schools for a competition
create or replace function set_competition_allowed_schools(
  p_competition_id uuid,
  p_school_ids uuid[]
) returns void
language plpgsql security definer
as $$
begin
  -- Delete existing entries
  delete from competition_allowed_schools 
  where competition_id = p_competition_id;
  
  -- Insert new entries
  insert into competition_allowed_schools (competition_id, school_id)
  select p_competition_id, unnest(p_school_ids);
  
  -- Ensure the competition is set to restricted visibility
  update competitions
  set visibility = 'restricted'
  where id = p_competition_id;
end;
$$;
```
