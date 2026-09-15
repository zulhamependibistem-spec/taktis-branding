-- location_name: nama alamat dari reverse-geocoding OpenStreetMap saat check-in foto.
-- Kolom saat ini sudah ada di DB produksi (ditambahkan manual) — file ini untuk lingkungan baru.
alter table attendance
  add column if not exists location_name text;