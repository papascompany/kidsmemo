create type public.member_role as enum ('owner', 'manager', 'teacher', 'admin');
create type public.organization_type as enum ('daycare', 'kindergarten');
create type public.benefit_issue_mode as enum ('jumbokids_api', 'manual');
create type public.target_scope as enum ('all_members', 'selected_members');
create type public.notice_type as enum ('image', 'html');
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

create table public.coupon_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  issue_mode public.benefit_issue_mode not null,
  target_scope public.target_scope not null default 'all_members',
  valid_from date not null,
  valid_until date not null,
  is_active boolean not null default true,
  notice_type public.notice_type not null,
  notice_html text,
  notice_image_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (valid_until >= valid_from),
  check (
    (notice_type = 'html' and notice_html is not null and notice_image_path is null)
    or (notice_type = 'image' and notice_image_path is not null and notice_html is null)
  )
);

create table public.coupon_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  title text not null,
  benefit_type text not null check (benefit_type in ('coupon', 'credit')),
  amount_label text not null,
  manual_code text,
  manual_url text,
  jumbokids_benefit_type text,
  created_at timestamptz not null default now(),
  check (
    (manual_code is not null or manual_url is not null)
    or jumbokids_benefit_type is not null
  )
);

create table public.coupon_campaign_targets (
  campaign_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (organization_id is not null or profile_id is not null),
  check (organization_id is null or profile_id is null),
  unique (campaign_id, organization_id, profile_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  coupon_campaign_id uuid references public.coupon_campaigns(id),
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

create table public.message_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  campaign_id uuid not null references public.coupon_campaigns(id) on delete cascade,
  scheduled_for timestamptz not null,
  channels public.message_channel[] not null default '{alimtalk,sms,email}',
  status public.delivery_status not null default 'queued',
  recipient_count integer not null default 0,
  landing_url text not null,
  created_at timestamptz not null default now(),
  unique (event_id, campaign_id, scheduled_for)
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

create index coupon_items_campaign_id_idx on public.coupon_items(campaign_id);
create index coupon_campaign_targets_campaign_id_idx on public.coupon_campaign_targets(campaign_id);
create index events_organization_event_date_idx on public.events(organization_id, event_date);
create index message_jobs_event_campaign_idx on public.message_jobs(event_id, campaign_id);
create index message_deliveries_job_id_idx on public.message_deliveries(job_id);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  kind text not null check (kind in ('event_assistant', 'parent_message')),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.events enable row level security;
alter table public.coupon_campaigns enable row level security;
alter table public.coupon_items enable row level security;
alter table public.coupon_campaign_targets enable row level security;
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

create policy "members can read organization events"
  on public.events for select
  using (
    exists (
      select 1 from public.memberships
      where memberships.organization_id = events.organization_id
      and memberships.profile_id = auth.uid()
    )
  );
