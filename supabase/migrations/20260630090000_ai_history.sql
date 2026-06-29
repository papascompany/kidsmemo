create index if not exists ai_generations_organization_created_at_idx
  on public.ai_generations(organization_id, created_at desc);

create index if not exists ai_generations_profile_created_at_idx
  on public.ai_generations(profile_id, created_at desc);

drop policy if exists "members can read accessible ai generations" on public.ai_generations;

create policy "organization staff can read organization ai generations"
  on public.ai_generations for select
  using (
    profile_id = auth.uid()
    or public.is_platform_admin()
    or (
      organization_id is not null
      and public.is_organization_staff(organization_id)
    )
  );
