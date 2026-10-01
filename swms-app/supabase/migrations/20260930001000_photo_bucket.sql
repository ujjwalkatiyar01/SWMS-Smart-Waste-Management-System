-- 06 §10: private bucket for all photos. Only the server uploads (service role), so there are
-- no storage policies for users. Photos are always re-encoded to JPEG (05-STORAGE-PHOTOS §3).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;
