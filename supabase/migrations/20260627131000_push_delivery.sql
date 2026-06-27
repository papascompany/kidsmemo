create type public.push_delivery_status as enum ('sent', 'skipped', 'failed');
create type public.push_delivery_provider as enum ('mock');

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.push_campaigns(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_role public.member_role not null,
  provider public.push_delivery_provider not null default 'mock',
  status public.push_delivery_status not null,
  provider_message_id text,
  skipped_reason text,
  failure_reason text,
  metadata jsonb not null default '{}',
  requested_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint push_deliveries_status_reason_check check (
    (status = 'sent' and skipped_reason is null and failure_reason is null)
    or (status = 'skipped' and skipped_reason is not null and failure_reason is null)
    or (status = 'failed' and failure_reason is not null)
  )
);

create index push_deliveries_campaign_idx on public.push_deliveries(campaign_id, created_at);
create index push_deliveries_recipient_idx on public.push_deliveries(recipient_profile_id, created_at);
create index push_deliveries_org_status_idx on public.push_deliveries(organization_id, status, created_at);

alter table public.push_deliveries enable row level security;

create policy "recipients can read own push deliveries"
  on public.push_deliveries for select
  using (
    recipient_profile_id = auth.uid()
    or public.is_platform_admin()
    or (
      organization_id is not null
      and public.current_member_role(organization_id) in ('owner', 'manager')
    )
  );

create policy "platform admins can manage push deliveries"
  on public.push_deliveries for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
