-- v10: foto profil SPG di tabel users (URL public, bucket storage 'avatars').
alter table users add column if not exists avatar_url text;