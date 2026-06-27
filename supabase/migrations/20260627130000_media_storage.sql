insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-media',
  'admin-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read admin media" on storage.objects;
create policy "public can read admin media"
  on storage.objects for select
  using (bucket_id = 'admin-media');

drop policy if exists "platform admins can upload admin media" on storage.objects;
create policy "platform admins can upload admin media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'admin-media' and public.is_platform_admin());

drop policy if exists "platform admins can update admin media" on storage.objects;
create policy "platform admins can update admin media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'admin-media' and public.is_platform_admin())
  with check (bucket_id = 'admin-media' and public.is_platform_admin());

drop policy if exists "platform admins can delete admin media" on storage.objects;
create policy "platform admins can delete admin media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'admin-media' and public.is_platform_admin());
