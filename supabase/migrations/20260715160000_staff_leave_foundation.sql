create type public.leave_calculation_basis as enum ('hire_date', 'calendar_year');
create type public.leave_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.organization_leave_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  headcount integer not null default 5 check (headcount >= 0),
  calculation_basis public.leave_calculation_basis not null default 'hire_date',
  effective_from date not null default current_date,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_employment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  hire_date date not null,
  termination_date date,
  weekly_hours numeric(5,2) not null default 40 check (weekly_hours >= 0 and weekly_hours <= 168),
  annual_attendance_rate numeric(5,4) check (annual_attendance_rate is null or (annual_attendance_rate >= 0 and annual_attendance_rate <= 1)),
  employment_type text not null default 'regular',
  monthly_attendance jsonb not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id),
  constraint staff_employment_dates_check check (termination_date is null or termination_date >= hire_date)
);

create table public.annual_leave_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  grant_date date not null,
  period_start date not null,
  period_end date not null,
  entitlement_days numeric(5,2) not null check (entitlement_days >= 0 and entitlement_days <= 25),
  used_days numeric(5,2) not null default 0 check (used_days >= 0 and used_days <= entitlement_days),
  expires_on date,
  source text not null default 'statutory_annual_leave',
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id, grant_date, source),
  constraint annual_leave_period_check check (period_end >= period_start)
);

create table public.staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null default 'annual',
  start_date date not null,
  end_date date not null,
  requested_days numeric(5,2) not null check (requested_days > 0),
  reason text not null default '',
  status public.leave_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_leave_request_dates_check check (end_date >= start_date)
);

create index staff_employment_org_idx on public.staff_employment_records(organization_id, hire_date);
create index annual_leave_grants_profile_idx on public.annual_leave_grants(organization_id, profile_id, grant_date);
create index staff_leave_requests_org_status_idx on public.staff_leave_requests(organization_id, status, start_date);

alter table public.organization_leave_settings enable row level security;
alter table public.staff_employment_records enable row level security;
alter table public.annual_leave_grants enable row level security;
alter table public.staff_leave_requests enable row level security;

create policy "organization staff can read leave settings"
  on public.organization_leave_settings for select
  using (public.is_platform_admin() or public.is_organization_staff(organization_id));

create policy "organization managers can manage leave settings"
  on public.organization_leave_settings for all
  using (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'))
  with check (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'));

create policy "staff can read employment records"
  on public.staff_employment_records for select
  using (
    public.is_platform_admin()
    or profile_id = auth.uid()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  );

create policy "organization managers can manage employment records"
  on public.staff_employment_records for all
  using (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'))
  with check (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'));

create policy "staff can read leave grants"
  on public.annual_leave_grants for select
  using (
    public.is_platform_admin()
    or profile_id = auth.uid()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  );

create policy "organization managers can manage leave grants"
  on public.annual_leave_grants for all
  using (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'))
  with check (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'));

create policy "staff can read leave requests"
  on public.staff_leave_requests for select
  using (
    public.is_platform_admin()
    or profile_id = auth.uid()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  );

create policy "staff can create own leave requests"
  on public.staff_leave_requests for insert
  with check (profile_id = auth.uid() and public.is_organization_staff(organization_id));

create policy "requesters can cancel pending leave requests"
  on public.staff_leave_requests for update
  using (profile_id = auth.uid() and status = 'pending')
  with check (profile_id = auth.uid() and status = 'cancelled');

create policy "organization managers can review leave requests"
  on public.staff_leave_requests for update
  using (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'))
  with check (public.is_platform_admin() or public.current_member_role(organization_id) in ('owner', 'manager'));
