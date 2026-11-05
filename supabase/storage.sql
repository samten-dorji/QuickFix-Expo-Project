-- Run as project owner in Supabase SQL Editor. Firebase project: fixquickproject.
-- Dedicated bucket: do not add other permissive policies covering this bucket.
begin;
create schema if not exists quickfix_private;
revoke all on schema quickfix_private from public, anon, authenticated;
grant usage on schema quickfix_private to authenticated;
create table if not exists quickfix_private.photo_students (firebase_uid text primary key check (length(firebase_uid) between 1 and 128));
create table if not exists quickfix_private.photo_admins (firebase_uid text primary key check (length(firebase_uid) between 1 and 128));
alter table quickfix_private.photo_students enable row level security;
alter table quickfix_private.photo_admins enable row level security;
revoke all on quickfix_private.photo_students, quickfix_private.photo_admins from public, anon, authenticated;

create or replace function quickfix_private.firebase_identity() returns boolean
language sql stable set search_path = '' as $$
 select coalesce(auth.jwt()->>'iss' = 'https://securetoken.google.com/fixquickproject'
   and auth.jwt()->>'aud' = 'fixquickproject'
   and auth.jwt()->>'role' = 'authenticated'
   and length(auth.jwt()->>'sub') between 1 and 128
   and auth.jwt()->'firebase'->>'sign_in_provider' <> 'anonymous', false);
$$;
create or replace function quickfix_private.is_photo_student() returns boolean
language sql stable security definer set search_path = '' as $$
 select quickfix_private.firebase_identity() and exists
 (select 1 from quickfix_private.photo_students where firebase_uid = auth.jwt()->>'sub')
 and not exists (select 1 from quickfix_private.photo_admins where firebase_uid = auth.jwt()->>'sub');
$$;
create or replace function quickfix_private.is_photo_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select quickfix_private.firebase_identity() and exists
 (select 1 from quickfix_private.photo_admins where firebase_uid = auth.jwt()->>'sub');
$$;
revoke all on function quickfix_private.firebase_identity(), quickfix_private.is_photo_student(), quickfix_private.is_photo_admin() from public, anon;
grant execute on function quickfix_private.firebase_identity(), quickfix_private.is_photo_student(), quickfix_private.is_photo_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive guards also protect this bucket from unrelated permissive policies.
drop policy if exists quickfix_photo_guard on storage.objects;
create policy quickfix_photo_guard on storage.objects as restrictive for all to public
using (bucket_id <> 'request-photos' or (
 quickfix_private.firebase_identity() and
 (quickfix_private.is_photo_admin() or (quickfix_private.is_photo_student() and (storage.foldername(name))[2] = auth.jwt()->>'sub'))))
with check (bucket_id <> 'request-photos' or (
 quickfix_private.is_photo_student() and (storage.foldername(name))[1] = 'requests'
 and (storage.foldername(name))[2] = auth.jwt()->>'sub'
 and name ~ '^requests/[^/]+/[^/]+/[a-zA-Z0-9-]+\.jpg$'));

drop policy if exists quickfix_photo_insert on storage.objects;
create policy quickfix_photo_insert on storage.objects for insert to authenticated with check (
 bucket_id = 'request-photos' and quickfix_private.is_photo_student()
 and (storage.foldername(name))[1] = 'requests' and (storage.foldername(name))[2] = auth.jwt()->>'sub'
 and name ~ '^requests/[^/]+/[^/]+/[a-zA-Z0-9-]+\.jpg$');
drop policy if exists quickfix_photo_read on storage.objects;
create policy quickfix_photo_read on storage.objects for select to authenticated using (
 bucket_id = 'request-photos' and quickfix_private.firebase_identity()
 and (quickfix_private.is_photo_admin() or
 (quickfix_private.is_photo_student() and (storage.foldername(name))[1] = 'requests' and (storage.foldername(name))[2] = auth.jwt()->>'sub')));
drop policy if exists quickfix_photo_delete on storage.objects;
create policy quickfix_photo_delete on storage.objects for delete to authenticated using (
 bucket_id = 'request-photos' and quickfix_private.is_photo_student()
 and (storage.foldername(name))[1] = 'requests' and (storage.foldername(name))[2] = auth.jwt()->>'sub');
drop policy if exists quickfix_photo_delete_guard on storage.objects;
create policy quickfix_photo_delete_guard on storage.objects as restrictive for delete to public
using (bucket_id <> 'request-photos' or (quickfix_private.is_photo_student() and (storage.foldername(name))[2] = auth.jwt()->>'sub'));
-- Never overwrite/reassign an object, including through any pre-existing UPDATE policy.
drop policy if exists quickfix_photo_no_update on storage.objects;
create policy quickfix_photo_no_update on storage.objects as restrictive for update to public
using (bucket_id <> 'request-photos') with check (bucket_id <> 'request-photos');
commit;
