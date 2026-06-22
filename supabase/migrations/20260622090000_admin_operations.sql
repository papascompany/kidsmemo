create type public.content_scope as enum ('landing', 'organization');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.gift_code_status as enum ('available', 'issued', 'redeemed', 'expired', 'void');
create type public.push_campaign_status as enum ('draft', 'scheduled', 'sent', 'failed', 'cancelled');

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  scope public.content_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  slot text not null,
  title text not null default '',
  body text not null default '',
  image_url text,
  cta_label text,
  cta_url text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_blocks_scope_organization_check check (
    (scope = 'landing' and organization_id is null)
    or (scope = 'organization' and organization_id is not null)
  )
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  scope public.content_scope not null default 'landing',
  organization_id uuid references public.organizations(id) on delete cascade,
  label text not null,
  url text not null,
  alt_text text not null default '',
  usage_slot text,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint media_assets_scope_organization_check check (
    (scope = 'landing' and organization_id is null)
    or (scope = 'organization' and organization_id is not null)
  )
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attendance_date date not null,
  class_name text not null,
  child_name text not null,
  status public.attendance_status not null default 'present',
  note text not null default '',
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, attendance_date, class_name, child_name)
);

create table public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  code text not null unique,
  amount_label text not null,
  status public.gift_code_status not null default 'available',
  assigned_to_profile_id uuid references public.profiles(id),
  issued_at timestamptz,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  target_role public.member_role,
  status public.push_campaign_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index content_blocks_scope_status_idx on public.content_blocks(scope, status, sort_order);
create index content_blocks_organization_idx on public.content_blocks(organization_id, status);
create unique index content_blocks_landing_slot_unique
  on public.content_blocks(slot)
  where scope = 'landing' and organization_id is null;
create unique index content_blocks_organization_slot_unique
  on public.content_blocks(organization_id, slot)
  where scope = 'organization' and organization_id is not null;
create index media_assets_scope_idx on public.media_assets(scope, organization_id);
create index attendance_records_org_date_idx on public.attendance_records(organization_id, attendance_date);
create index gift_codes_org_status_idx on public.gift_codes(organization_id, status);
create index push_campaigns_org_status_idx on public.push_campaigns(organization_id, status);
create index admin_audit_logs_resource_idx on public.admin_audit_logs(resource_type, resource_id, created_at);

alter table public.content_blocks enable row level security;
alter table public.media_assets enable row level security;
alter table public.attendance_records enable row level security;
alter table public.gift_codes enable row level security;
alter table public.push_campaigns enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "public can read published landing content"
  on public.content_blocks for select
  using (
    public.is_platform_admin()
    or (scope = 'landing' and status = 'published')
    or (
      scope = 'organization'
      and organization_id is not null
      and public.is_organization_staff(organization_id)
    )
  );

create policy "platform admins can manage content blocks"
  on public.content_blocks for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "public can read published media"
  on public.media_assets for select
  using (
    public.is_platform_admin()
    or (scope = 'landing' and status = 'published')
    or (
      scope = 'organization'
      and status = 'published'
      and organization_id is not null
      and public.is_organization_staff(organization_id)
    )
  );

create policy "platform admins can manage media assets"
  on public.media_assets for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "organization staff can read attendance"
  on public.attendance_records for select
  using (public.is_platform_admin() or public.is_organization_staff(organization_id));

create policy "platform admins can manage attendance"
  on public.attendance_records for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "organization staff can read assigned gift codes"
  on public.gift_codes for select
  using (
    public.is_platform_admin()
    or (organization_id is not null and public.is_organization_staff(organization_id))
  );

create policy "platform admins can manage gift codes"
  on public.gift_codes for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "organization staff can read push campaigns"
  on public.push_campaigns for select
  using (
    public.is_platform_admin()
    or (organization_id is not null and public.is_organization_staff(organization_id))
  );

create policy "platform admins can manage push campaigns"
  on public.push_campaigns for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform admins can read audit logs"
  on public.admin_audit_logs for select
  using (public.is_platform_admin());

create policy "platform admins can create audit logs"
  on public.admin_audit_logs for insert
  with check (public.is_platform_admin());
