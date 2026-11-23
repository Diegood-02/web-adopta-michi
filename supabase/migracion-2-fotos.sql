-- Migración 2: fotos propias de cada gato (Storage) y permisos de administrador.
-- Ejecutar UNA sola vez en el SQL Editor de Supabase, después de schema.sql y seed.sql.
-- No borra datos. Es seguro repetirlo.

-- 1) Columna para la URL de la foto propia (si está vacía, se usa la foto de ejemplo).
alter table public.gatos add column if not exists foto_url text
  check (foto_url is null or char_length(foto_url) <= 300);

-- 2) Bucket público para las fotos: solo imágenes y máximo 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gatos', 'gatos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 3) Cualquiera puede ver las fotos; solo el administrador puede subirlas, cambiarlas o borrarlas.
drop policy if exists gatos_fotos_leer on storage.objects;
create policy gatos_fotos_leer on storage.objects for select
  using (bucket_id = 'gatos');

drop policy if exists gatos_fotos_subir on storage.objects;
create policy gatos_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'gatos' and public.es_admin());

drop policy if exists gatos_fotos_actualizar on storage.objects;
create policy gatos_fotos_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'gatos' and public.es_admin())
  with check (bucket_id = 'gatos' and public.es_admin());

drop policy if exists gatos_fotos_borrar on storage.objects;
create policy gatos_fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'gatos' and public.es_admin());
