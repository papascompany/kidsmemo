create or replace function public.create_onboarding_organization(
  profile_name text,
  profile_phone text,
  organization_name text,
  organization_type public.organization_type,
  organization_region text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
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

  insert into public.organizations (name, type, region)
  values (
    nullif(trim(organization_name), ''),
    organization_type,
    nullif(trim(organization_region), '')
  )
  returning id into new_organization_id;

  insert into public.memberships (organization_id, profile_id, role)
  values (new_organization_id, current_user_id, 'owner')
  on conflict (organization_id, profile_id) do update
    set role = excluded.role;

  return jsonb_build_object(
    'profileId', current_user_id,
    'organizationId', new_organization_id,
    'role', 'owner'
  );
end;
$$;

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
  target_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  begin
    target_organization_id := trim(invite_code)::uuid;
  exception
    when invalid_text_representation then
      raise exception 'invalid_invite_code' using errcode = '22023';
  end;

  if not exists (
    select 1
    from public.organizations
    where id = target_organization_id
  ) then
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
  values (target_organization_id, current_user_id, 'teacher')
  on conflict (organization_id, profile_id) do update
    set role = memberships.role;

  return jsonb_build_object(
    'profileId', current_user_id,
    'organizationId', target_organization_id,
    'role', 'teacher'
  );
end;
$$;

revoke all on function public.create_onboarding_organization(
  text,
  text,
  text,
  public.organization_type,
  text
) from public, anon;

revoke all on function public.join_onboarding_organization(text, text, text) from public, anon;

grant execute on function public.create_onboarding_organization(
  text,
  text,
  text,
  public.organization_type,
  text
) to authenticated;

grant execute on function public.join_onboarding_organization(text, text, text) to authenticated;
