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
  unique (organization_id, code)
);

create table public.staff_coupon_downloads (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.staff_coupons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  downloaded_at timestamptz not null default now()
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

create policy "members can read their organizations"
  on public.organizations for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.organization_id = organizations.id
      and memberships.profile_id = auth.uid()
    )
  );

create policy "members can read their memberships"
  on public.memberships for select
  using (profile_id = auth.uid());

create policy "members can read organization events"
  on public.events for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.organization_id = events.organization_id
      and memberships.profile_id = auth.uid()
    )
  );

create policy "members can read assigned staff coupons"
  on public.staff_coupons for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.organization_id = staff_coupons.organization_id
      and memberships.profile_id = auth.uid()
      and (
        staff_coupons.assigned_to = 'all_staff'
        or (staff_coupons.assigned_to = 'owner' and memberships.role = 'owner')
        or (staff_coupons.assigned_to = 'teacher' and memberships.role in ('teacher', 'manager', 'owner'))
      )
    )
  );

create policy "members can record their own coupon downloads"
  on public.staff_coupon_downloads for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.memberships
      where memberships.organization_id = staff_coupon_downloads.organization_id
      and memberships.profile_id = auth.uid()
    )
  );

create policy "members can read their own coupon downloads"
  on public.staff_coupon_downloads for select
  using (profile_id = auth.uid());
