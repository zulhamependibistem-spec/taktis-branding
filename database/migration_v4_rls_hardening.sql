-- RLS hardening: app hanya memakai service_role (server-only, tidak ada supabase-auth
-- di browser). Cabut seluruh hak anon/authenticated agar kunci publik yang bocor tidak
-- membaca/menulis apa pun. Policies lama dibiarkan (inert) sebagai dokumentasi niat.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;