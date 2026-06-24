create table public.attendance_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attendance_date date not null,
  class_name text not null,
  is_closed boolean not null default true,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, attendance_date, class_name),
  constraint attendance_closures_class_name_check check (length(btrim(class_name)) > 0),
  constraint attendance_closures_closed_metadata_check check (
    not is_closed or closed_at is not null
  )
);

create index attendance_closures_org_date_idx
  on public.attendance_closures(organization_id, attendance_date);

alter table public.attendance_closures enable row level security;

create policy "organization staff can read attendance closures"
  on public.attendance_closures for select
  using (
    public.is_platform_admin()
    or public.is_organization_staff(organization_id)
  );

create policy "platform admins can manage attendance closures"
  on public.attendance_closures for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create function public.reject_closed_attendance_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.attendance_closures
    where organization_id = new.organization_id
      and attendance_date = new.attendance_date
      and class_name = new.class_name
      and is_closed
  ) then
    raise exception 'attendance_closed'
      using errcode = 'P0001',
            detail = 'Reopen the attendance scope before changing records.';
  end if;

  return new;
end;
$$;

create trigger attendance_records_reject_closed_write
  before insert or update on public.attendance_records
  for each row execute function public.reject_closed_attendance_write();
