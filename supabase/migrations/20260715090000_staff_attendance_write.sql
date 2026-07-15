create policy "organization staff can create attendance"
  on public.attendance_records for insert
  with check (public.is_organization_staff(organization_id));

create policy "organization staff can update attendance"
  on public.attendance_records for update
  using (public.is_organization_staff(organization_id))
  with check (public.is_organization_staff(organization_id));
