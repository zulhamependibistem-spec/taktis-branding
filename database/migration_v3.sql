-- ============================================================
-- WOW JSM SPG Attendance & Reporting App
-- Database Migration v3.0
-- Persiapan data REAL:
--   - users: tambah kolom profil (area/grsm/regional/jabatan/pic/tl_name/nama_toko)
--   - users.role: tambah 'pic'
--   - users.nip: relax unique? NO -- NIP tetap unique (kredensial login)
--   - tabel baru user_outlets (many-to-many user <-> outlet, untuk multi-toko)
-- ============================================================
-- Run di Supabase SQL Editor SETELAH migration_v1.sql + migration_v2.sql
-- ============================================================

-- 1. Tambah kolom profil pada users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS area        text,   -- dari master / M4
    ADD COLUMN IF NOT EXISTS grsm        text,
    ADD COLUMN IF NOT EXISTS regional    text,
    ADD COLUMN IF NOT EXISTS jabatan     text,   -- TL SENIOR / SPG STAY JSM / SPG/B / PIC
    ADD COLUMN IF NOT EXISTS pic         text,   -- nama PIC penanggung jawab
    ADD COLUMN IF NOT EXISTS tl_name     text,   -- nama TL (untuk SPG), sumber W34
    ADD COLUMN IF NOT EXISTS nama_toko   text;   -- nama toko dari M4 (kolom 44)

-- 2. Extend role CHECK: tambah 'pic'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('spg', 'tl', 'pic', 'admin'));

-- 2b. users.nip: izinkan NULL (2 SPG/B belum punya NIP, belum release HR)
ALTER TABLE users ALTER COLUMN nip DROP NOT NULL;

-- 3. Tabel user_outlets (multi-toko: riwayat & daftar semua toko SPG)
--    assigned_outlet_id di users = toko AKTIF sekarang (default check-in)
CREATE TABLE IF NOT EXISTS user_outlets (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    outlet_id   uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_user_outlets_user   ON user_outlets (user_id);
CREATE INDEX IF NOT EXISTS idx_user_outlets_outlet ON user_outlets (outlet_id);

ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_outlets_select_own" ON user_outlets
    FOR SELECT USING (
        user_id = get_my_id()
        OR get_my_role() IN ('tl', 'pic', 'admin')
    );

CREATE POLICY "user_outlets_admin_write" ON user_outlets
    FOR ALL USING (get_my_role() = 'admin');

-- DONE
