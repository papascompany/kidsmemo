create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.member_role not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint invites_code_not_blank check (length(trim(code)) between 6 and 64),
  constraint invites_role_check check (role in ('manager', 'teacher')),
  constraint invites_max_uses_check check (max_uses is null or max_uses > 0),
  constraint invites_used_count_check check (used_count >= 0 and (max_uses is null or used_count <= max_uses))
);

create unique index invites_code_unique_idx on public.invites (lower(code));
create index invites_organization_idx on public.invites (organization_id, revoked_at, expires_at);

alter table public.invites enable row level security;

grant select, insert, update, delete on public.invites to authenticated;

create policy "organization staff can read invites"
  on public.invites for select
  using (
    public.is_platform_admin()
    or public.is_organization_staff(organization_id)
  );

create policy "owners and managers can create invites"
  on public.invites for insert
  with check (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) in ('owner', 'manager')
      and created_by = auth.uid()
      and role in ('manager', 'teacher')
      and revoked_at is null
      and used_count = 0
    )
  );

create policy "owners and managers can update invites"
  on public.invites for update
  using (
    public.is_platform_admin()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  )
  with check (
    public.is_platform_admin()
    or (
      public.current_member_role(organization_id) in ('owner', 'manager')
      and role in ('manager', 'teacher')
    )
  );

create policy "owners and managers can delete invites"
  on public.invites for delete
  using (
    public.is_platform_admin()
    or public.current_member_role(organization_id) in ('owner', 'manager')
  );

create or replace function public.join_onboarding_organization(
  profile_name text,
  profile_phone text,
  invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  normalized_invite_code text := lower(trim(invite_code));
  target_invite public.invites%rowtype;
  existing_role public.member_role;
  inserted_membership_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if normalized_invite_code = '' then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select *
  into target_invite
  from public.invites
  where lower(code) = normalized_invite_code
  for update;

  if not found
    or target_invite.revoked_at is not null
    or (target_invite.expires_at is not null and target_invite.expires_at <= now())
    or (target_invite.max_uses is not null and target_invite.used_count >= target_invite.max_uses) then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select email
  into current_user_email
  from auth.users
  where id = current_user_id;

  insert into public.profiles (id, name, email, phone)
  values (
    current_user_id,
    nullif(trim(profile_name), ''),
    coalesce(current_user_email, ''),
    nullif(trim(profile_phone), '')
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        phone = excluded.phone;

  insert into public.memberships (organization_id, profile_id, role)
  values (target_invite.organization_id, current_user_id, target_invite.role)
  on conflict (organization_id, profile_id) do nothing;

  get diagnostics inserted_membership_count = row_count;

  if inserted_membership_count > 0 then
    update public.invites
    set used_count = used_count + 1
    where id = target_invite.id;

    existing_role := target_invite.role;
  else
    select role
    into existing_role
    from public.memberships
    where organization_id = target_invite.organization_id
      and profile_id = current_user_id;
  end if;

  return jsonb_build_object(
    'profileId', current_user_id,
    'organizationId', target_invite.organization_id,
    'role', coalesce(existing_role, target_invite.role)
  );
end;
$$;

revoke all on function public.join_onboarding_organization(text, text, text) from public, anon;
grant execute on function public.join_onboarding_organization(text, text, text) to authenticated;
