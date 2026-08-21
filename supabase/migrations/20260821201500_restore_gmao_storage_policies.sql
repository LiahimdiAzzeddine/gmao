drop policy if exists "Staff can read gmao file metadata" on storage.objects;
drop policy if exists "Staff can upload gmao files" on storage.objects;
drop policy if exists "Staff can update gmao files" on storage.objects;
drop policy if exists "Admins can delete gmao files" on storage.objects;

create policy "Staff can read gmao file metadata"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gmao-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'technicien')
  )
);

create policy "Staff can upload gmao files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gmao-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'technicien')
  )
);

create policy "Staff can update gmao files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gmao-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'technicien')
  )
)
with check (
  bucket_id = 'gmao-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'technicien')
  )
);

create policy "Admins can delete gmao files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gmao-photos'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
