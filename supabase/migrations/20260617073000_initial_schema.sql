create type public.member_role as enum ('owner', 'manager', 'teacher', 'admin');
create type public.organization_type as enum ('daycare', 'kindergarten');
create type public.staff_coupon_assignee as enum ('owner', 'teacher', 'all_staff');
create type public.staff_coupon_status as enum ('available', 'downloaded', 'used', 'expired');
create type public.coupon_use_site as enum ('jumbokids', 'godomall');
create type public.delivery_status as enum ('queued', 'sent', 'failed', 'fallback');
create type public.message_channel as enum ('alimtalk', 'sms', 'email');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.organization_type not null,
  region text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'teacher',
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  event_date date not null,
  audience text not null,
  class_names text[] not null default '{}',
  description text not null default '',
  supplies text[] not null default '{}',
  repeat_rule text check (repeat_rule in ('yearly')),
  reminder_status text not null default 'not_scheduled',
  created_at timestamptz not null default now()
);

create table public.staff_coupons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  code text not null,
  amount_label text not null,
  valid_until date not null,
  assigned_to public.staff_coupon_assignee not null default 'all_staff',
  status public.staff_coupon_status not null default 'available',
  sites public.coupon_use_site[] not null default '{jumbokids}',
  jumbokids_url text,
  godomall_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.staff_coupon_downloads (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.staff_coupons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  unique (coupon_id, profile_id),
  foreign key (coupon_id, organization_id) references public.staff_coupons(id, organization_id) on delete cascade
);

create table public.message_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  scheduled_for timestamptz not null,
  channels public.message_channel[] not null default '{alimtalk,sms,email}',
  status public.delivery_status not null default 'queued',
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, scheduled_for)
);

create table public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.message_jobs(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id),
  channel public.message_channel not null,
  status public.delivery_status not null default 'queued',
  provider_message_id text,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  kind text not null check (kind in ('event_assistant', 'parent_message')),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

create index events_organization_event_date_idx on public.events(organization_id, event_date);
create index staff_coupons_organization_status_idx on public.staff_coupons(organization_id, status);
create index staff_coupon_downloads_coupon_idx on public.staff_coupon_downloads(coupon_id);
create index message_jobs_event_idx on public.message_jobs(event_id);
create index message_deliveries_job_id_idx on public.message_deliveries(job_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.events enable row level security;
alter table public.staff_coupons enable row level security;
alter table public.staff_coupon_downloads enable row level security;
alter table public.message_jobs enable row level security;
alter table public.message_deliveries enable row level security;
alter table public.ai_generations enable row level security;

create function public.current_member_role(target_organization_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.memberships
  where organization_id = target_organization_id
    and profile_id = auth.uid()
  limit 1
$$;

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where profile_id = auth.uid()
      and role = 'admin'
  )
$$;

create function public.is_organization_staff(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role(target_organization_id) in ('owner', 'manager', 'teacher')
$$;

create function public.can_write_events(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_role(target_organization_id) in ('owner', 'manager', 'teacher')
    or public.is_platform_admin()
$$;

create function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1
      from public.memberships viewer
      join public.memberships target
        on target.organization_id = viewer.organization_id
      where viewer.profile_id = auth.uid()
        and target.profile_id = target_profile_id
        and viewer.role in ('owner', 'manager', 'teacher')
        and target.role in ('owner', 'manager', 'teacher')
    )
$$;

create function public.can_read_staff_coupon(target_coupon_id uuid, target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.staff_coupons coupon
      where coupon.id = target_coupon_id
        and coupon.organization_id = target_organization_id
        and public.current_member_role(target_organization_id) in ('owner', 'manager', 'teacher')
        and (
          coupon.assigned_to = 'all_staff'
          or (
            coupon.assigned_to = 'owner'
            and public.current_member_role(target_organization_id) = 'owner'
          )
          or (
            coupon.assigned_to = 'teacher'
            and public.current_member_role(target_organization_id) in ('owner', 'manager', 'teacher')
          )
        )
    )
$$;

create policy "members can read their organizations"
  on public.organizations for select
  using (
    public.is_platform_admin()
    or public.is_organization_staff(organizations.id)
  );

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid() or public.is_platform_admin());

create policy "users can read accessible profiles"
  on public.profiles for select
  using (public.can_read_profile(profiles.id));

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

create policy "platform admins can delete profiles"
  on public.profiles for delete
  using (public.is_platform_admin());

create policy "members can read organization memberships"
  on public.memberships for select
  using (
    profile_id = auth.uid()
    or public.is_platform_admin()
    or (
      public.is_organization_staff(memberships.organization_id)
      and memberships.role in ('owner', 'manager', 'teacher')
    )
  );

create policy "owners can add organization staff memberships"
  on public.memberships for insert
  with check (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) = 'owner'
      and role in ('owner', 'manager', 'teacher')
    )
  );

create policy "owners can update organization staff memberships"
  on public.memberships for update
  using (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) = 'owner'
      and role in ('owner', 'manager', 'teacher')
    )
  )
  with check (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) = 'owner'
      and role in ('owner', 'manager', 'teacher')
    )
  );

create policy "owners can remove organization staff memberships"
  on public.memberships for delete
  using (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) = 'owner'
      and role in ('owner', 'manager', 'teacher')
    )
  );

create policy "members can read organization events"
  on public.events for select
  using (public.is_platform_admin() or public.is_organization_staff(events.organization_id));

create policy "staff can create organization events"
  on public.events for insert
  with check (public.can_write_events(events.organization_id));

create policy "staff can update organization events"
  on public.events for update
  using (public.can_write_events(events.organization_id))
  with check (public.can_write_events(events.organization_id));

create policy "staff can delete organization events"
  on public.events for delete
  using (public.can_write_events(events.organization_id));

create policy "members can read assigned staff coupons"
  on public.staff_coupons for select
  using (public.can_read_staff_coupon(staff_coupons.id, staff_coupons.organization_id));

create policy "platform admins can manage staff coupons"
  on public.staff_coupons for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "members can record their own coupon downloads"
  on public.staff_coupon_downloads for insert
  with check (
    profile_id = auth.uid()
    and public.can_read_staff_coupon(
      staff_coupon_downloads.coupon_id,
      staff_coupon_downloads.organization_id
    )
  );

create policy "members can read accessible coupon downloads"
  on public.staff_coupon_downloads for select
  using (
    profile_id = auth.uid()
    or public.is_platform_admin()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  );

create policy "platform admins can remove coupon downloads"
  on public.staff_coupon_downloads for delete
  using (public.is_platform_admin());

create policy "members can read organization message jobs"
  on public.message_jobs for select
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.events
      where events.id = message_jobs.event_id
        and public.is_organization_staff(events.organization_id)
    )
  );

create policy "platform admins can manage message jobs"
  on public.message_jobs for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "members can read organization message deliveries"
  on public.message_deliveries for select
  using (
    recipient_profile_id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1
      from public.message_jobs
      join public.events on events.id = message_jobs.event_id
      where message_jobs.id = message_deliveries.job_id
        and public.is_organization_staff(events.organization_id)
    )
  );

create policy "platform admins can manage message deliveries"
  on public.message_deliveries for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "members can create their own ai generations"
  on public.ai_generations for insert
  with check (
    profile_id = auth.uid()
    and (
      organization_id is null
      or public.is_organization_staff(organization_id)
      or public.is_platform_admin()
    )
  );

create policy "members can read accessible ai generations"
  on public.ai_generations for select
  using (
    profile_id = auth.uid()
    or public.is_platform_admin()
    or (
      organization_id is not null
      and public.current_member_role(organization_id) in ('owner', 'manager')
    )
  );

create policy "members can delete their own ai generations"
  on public.ai_generations for delete
  using (profile_id = auth.uid() or public.is_platform_admin());

create policy "platform admins can update ai generations"
  on public.ai_generations for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform admins can manage organizations"
  on public.organizations for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
