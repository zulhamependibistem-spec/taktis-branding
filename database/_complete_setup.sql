-- =======================================
-- TAKTIS TSJ — COMPLETE DATABASE SETUP
-- Gabungan semua migration + seed_dev
-- Jalankan sekali saja di Supabase SQL Editor
-- =======================================


-- =======================================
-- migration_v1.sql
-- =======================================

-- ============================================================
-- WOW JSM SPG Attendance & Reporting App
-- Database Migration v1.0
-- Platform: Supabase (PostgreSQL)
-- Date: 2026-08-28
-- ============================================================
-- Run this entire file in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: outlets
-- ============================================================
CREATE TABLE outlets (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_subdist         text,
    code_outlet          text UNIQUE,
    name                 text NOT NULL,
    area                 text,
    grsm                 text,
    channel_group        text,
    target_sellout_value numeric DEFAULT 0,
    lat                  numeric,  -- koordinat pusat outlet untuk validasi GPS
    lng                  numeric,
    created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN outlets.lat IS 'Koordinat latitude pusat outlet untuk validasi geofence check-in';
COMMENT ON COLUMN outlets.lng IS 'Koordinat longitude pusat outlet untuk validasi geofence check-in';


-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE products (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          text NOT NULL DEFAULT 'WOW Spaghetti',
    variant       text NOT NULL,  -- CARBONARA, BOLOGNESE, AGLIO OLIO, GORENG
    default_price numeric NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true,
    UNIQUE (name, variant)
);


-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           text NOT NULL,
    nip                 text UNIQUE NOT NULL,   -- dari sistem BJM, dipakai sebagai kredensial login
    phone               text UNIQUE,            -- nomor HP, opsional untuk kontak
    role                text NOT NULL CHECK (role IN ('spg', 'tl', 'admin')),
    status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'backup')),
    assigned_outlet_id  uuid REFERENCES outlets(id) ON DELETE SET NULL,
    supervisor_id       uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN users.nip IS 'NIP dari sistem BJM. Dipakai sebagai password login. Login: NIP saja.';
COMMENT ON COLUMN users.supervisor_id IS 'Merujuk ke user dengan role tl yang menaungi SPG ini';


-- ============================================================
-- TABLE: outlet_product_prices
-- Override harga SKU per outlet oleh TL/Admin
-- Fallback ke products.default_price jika tidak ada baris
-- ============================================================
CREATE TABLE outlet_product_prices (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id   uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price       numeric NOT NULL,
    set_by      uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (outlet_id, product_id)
);


-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE attendance (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outlet_id               uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    report_date             date NOT NULL DEFAULT CURRENT_DATE,
    check_in_time           timestamptz,
    check_in_photo_url      text,
    check_in_lat            numeric,
    check_in_lng            numeric,
    check_out_time          timestamptz,
    check_out_photo_url     text,
    status                  text NOT NULL DEFAULT 'not_checked_in'
                                CHECK (status IN ('not_checked_in', 'on_time', 'late', 'location_unverified', 'checked_out')),
    location_bypass_reason  text,
    UNIQUE (user_id, outlet_id, report_date)
);

COMMENT ON COLUMN attendance.status IS 'not_checked_in â†’ on_time/late/location_unverified â†’ checked_out';
COMMENT ON COLUMN attendance.location_bypass_reason IS 'Wajib diisi jika status = location_unverified';


-- ============================================================
-- TABLE: daily_sales_reports
-- ============================================================
CREATE TABLE daily_sales_reports (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outlet_id     uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    report_date   date NOT NULL DEFAULT CURRENT_DATE,
    qty_sold      integer NOT NULL DEFAULT 0 CHECK (qty_sold >= 0),
    unit_price    numeric NOT NULL DEFAULT 0,   -- diisi otomatis server dari outlet_product_prices / default_price
    total_selling numeric GENERATED ALWAYS AS (qty_sold * unit_price) STORED,
    sampling_qty  integer DEFAULT 0 CHECK (sampling_qty >= 0),
    status        text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by   uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at   timestamptz,
    notes         text,   -- catatan revisi dari TL jika reject
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, outlet_id, product_id, report_date)
);

COMMENT ON COLUMN daily_sales_reports.total_selling IS 'Generated column: qty_sold * unit_price';
COMMENT ON COLUMN daily_sales_reports.unit_price IS 'Diisi otomatis server dari outlet_product_prices, fallback ke products.default_price';


-- ============================================================
-- TABLE: daily_stock_reports
-- ============================================================
CREATE TABLE daily_stock_reports (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outlet_id     uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    report_date   date NOT NULL DEFAULT CURRENT_DATE,
    stock_awal    integer NOT NULL DEFAULT 0 CHECK (stock_awal >= 0),
    stock_akhir   integer NOT NULL DEFAULT 0 CHECK (stock_akhir >= 0),
    selisih       integer GENERATED ALWAYS AS (stock_awal - stock_akhir) STORED,
    other_qty     integer DEFAULT 0 CHECK (other_qty >= 0),   -- unit tidak terjual & bukan sampling
    other_reason  text,   -- wajib diisi jika other_qty > 0
    status        text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by   uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, outlet_id, product_id, report_date)
);

COMMENT ON COLUMN daily_stock_reports.selisih IS 'Generated column: stock_awal - stock_akhir';
COMMENT ON COLUMN daily_stock_reports.other_qty IS 'Unit tidak terjual & bukan sampling (rusak, retur, expired, hilang)';
COMMENT ON COLUMN daily_stock_reports.other_reason IS 'Wajib diisi jika other_qty > 0';


-- ============================================================
-- INDEXES (performa query umum)
-- ============================================================
CREATE INDEX idx_attendance_user_date        ON attendance (user_id, report_date);
CREATE INDEX idx_attendance_outlet_date      ON attendance (outlet_id, report_date);
CREATE INDEX idx_sales_user_date             ON daily_sales_reports (user_id, report_date);
CREATE INDEX idx_sales_outlet_date           ON daily_sales_reports (outlet_id, report_date);
CREATE INDEX idx_sales_status                ON daily_sales_reports (status);
CREATE INDEX idx_stock_user_date             ON daily_stock_reports (user_id, report_date);
CREATE INDEX idx_stock_outlet_date           ON daily_stock_reports (outlet_id, report_date);
CREATE INDEX idx_stock_status                ON daily_stock_reports (status);
CREATE INDEX idx_users_supervisor            ON users (supervisor_id);
CREATE INDEX idx_users_outlet                ON users (assigned_outlet_id);
CREATE INDEX idx_users_nip                   ON users (nip);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE outlets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_product_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_reports    ENABLE ROW LEVEL SECURITY;


-- Helper function: ambil role dari JWT claim
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE AS $$
    SELECT (auth.jwt() -> 'user_metadata' ->> 'role')
$$;

-- Helper function: ambil user id dari JWT
CREATE OR REPLACE FUNCTION get_my_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT (auth.jwt() ->> 'sub')::uuid
$$;

-- Helper function: ambil outlet id dari JWT
CREATE OR REPLACE FUNCTION get_my_outlet_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT (auth.jwt() -> 'user_metadata' ->> 'assigned_outlet_id')::uuid
$$;


-- ---- outlets ----
-- Semua role bisa SELECT outlet
CREATE POLICY "outlets_select_all" ON outlets
    FOR SELECT USING (true);

-- Hanya admin bisa INSERT/UPDATE/DELETE
CREATE POLICY "outlets_admin_write" ON outlets
    FOR ALL USING (get_my_role() = 'admin');


-- ---- products ----
CREATE POLICY "products_select_all" ON products
    FOR SELECT USING (true);

CREATE POLICY "products_admin_write" ON products
    FOR ALL USING (get_my_role() = 'admin');


-- ---- users ----
-- SPG hanya bisa SELECT dirinya sendiri
CREATE POLICY "users_select_self" ON users
    FOR SELECT USING (
        id = get_my_id()
        OR get_my_role() IN ('tl', 'admin')
    );

-- TL bisa SELECT semua SPG binaannya
CREATE POLICY "users_tl_select_team" ON users
    FOR SELECT USING (
        get_my_role() = 'tl'
        AND supervisor_id = get_my_id()
    );

-- Admin punya akses penuh
CREATE POLICY "users_admin_all" ON users
    FOR ALL USING (get_my_role() = 'admin');


-- ---- outlet_product_prices ----
CREATE POLICY "prices_select_all" ON outlet_product_prices
    FOR SELECT USING (true);

CREATE POLICY "prices_tl_admin_write" ON outlet_product_prices
    FOR ALL USING (get_my_role() IN ('tl', 'admin'));


-- ---- attendance ----
-- SPG hanya bisa baca/tulis record miliknya sendiri di outlet assigned
CREATE POLICY "attendance_spg_own" ON attendance
    FOR ALL USING (
        user_id = get_my_id()
        AND outlet_id = get_my_outlet_id()
    );

-- TL bisa baca semua attendance SPG binaannya
CREATE POLICY "attendance_tl_read_team" ON attendance
    FOR SELECT USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

-- TL bisa UPDATE attendance (untuk verifikasi location_unverified)
CREATE POLICY "attendance_tl_verify_location" ON attendance
    FOR UPDATE USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

-- Admin akses penuh
CREATE POLICY "attendance_admin_all" ON attendance
    FOR ALL USING (get_my_role() = 'admin');


-- ---- daily_sales_reports ----
-- SPG hanya bisa akses laporan miliknya sendiri
CREATE POLICY "sales_spg_own" ON daily_sales_reports
    FOR ALL USING (user_id = get_my_id());

-- TL bisa SELECT + UPDATE (approve/reject) laporan SPG binaannya
CREATE POLICY "sales_tl_team" ON daily_sales_reports
    FOR SELECT USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

CREATE POLICY "sales_tl_approve" ON daily_sales_reports
    FOR UPDATE USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

-- Admin akses penuh
CREATE POLICY "sales_admin_all" ON daily_sales_reports
    FOR ALL USING (get_my_role() = 'admin');


-- ---- daily_stock_reports ----
CREATE POLICY "stock_spg_own" ON daily_stock_reports
    FOR ALL USING (user_id = get_my_id());

CREATE POLICY "stock_tl_team" ON daily_stock_reports
    FOR SELECT USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

CREATE POLICY "stock_tl_approve" ON daily_stock_reports
    FOR UPDATE USING (
        get_my_role() = 'tl'
        AND user_id IN (
            SELECT id FROM users WHERE supervisor_id = get_my_id()
        )
    );

CREATE POLICY "stock_admin_all" ON daily_stock_reports
    FOR ALL USING (get_my_role() = 'admin');


-- ============================================================
-- SEED DATA: Products (SKU WOW JSM)
-- ============================================================
INSERT INTO products (name, variant, default_price, is_active) VALUES
    ('WOW Spaghetti', 'CARBONARA',  2000, true),
    ('WOW Spaghetti', 'BOLOGNESE',  2000, true),
    ('WOW Spaghetti', 'AGLIO OLIO', 2000, true),
    ('WOW Spaghetti', 'GORENG',     2000, true);


-- ============================================================
-- DONE
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor:
-- Dashboard â†’ SQL Editor â†’ New Query â†’ Paste â†’ Run
-- ============================================================



-- =======================================
-- migration_v2.sql
-- =======================================

-- ============================================================
-- WOW JSM SPG Attendance & Reporting App
-- Database Migration v2.0
-- Simplifikasi status attendance sesuai keputusan bisnis:
--   - Tidak ada on_time / late / location_unverified
--   - Tidak ada validasi GPS radius / bypass lokasi
--   - GPS tetap dicatat (lat/lng) sebagai informasi, bukan validasi
-- Status attendance: not_checked_in â†’ checked_in â†’ checked_out
-- ============================================================
-- Run di Supabase SQL Editor SETELAH migration_v1.sql
-- ============================================================

-- 1. Drop constraint status lama pada attendance
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- 2. Tambah kolom helper status baru (default not_checked_in)
ALTER TABLE attendance
    ALTER COLUMN status SET DEFAULT 'not_checked_in';

ALTER TABLE attendance
    ADD CONSTRAINT attendance_status_check
    CHECK (status IN ('not_checked_in', 'checked_in', 'checked_out'));

-- 3. Kolom bypass lokasi tidak dipakai lagi â€” hapus
ALTER TABLE attendance
    DROP COLUMN IF EXISTS location_bypass_reason;

-- 4. Update RLS policy lama yang merefer status location_unverified
--    (tidak ada query mandatori; policy SELECT utk TL tetap valid)

-- DONE



-- =======================================
-- migration_v3.sql
-- =======================================

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



-- =======================================
-- migration_v4_rls_hardening.sql
-- =======================================

-- RLS hardening: app hanya memakai service_role (server-only, tidak ada supabase-auth
-- di browser). Cabut seluruh hak anon/authenticated agar kunci publik yang bocor tidak
-- membaca/menulis apa pun. Policies lama dibiarkan (inert) sebagai dokumentasi niat.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;


-- =======================================
-- migration_v5_perf.sql
-- =======================================

-- v5: perf + konsistensi
-- export/omzet admin scan by report_date saja (tanpa user_id) -> butuh index terpisah
create index if not exists idx_sales_reporter_date on daily_sales_reports (report_date);
create index if not exists idx_stock_reporter_date on daily_stock_reports (report_date);

-- set_by NOT NULL + ON DELETE SET NULL saling kontradiksi
alter table outlet_product_prices alter column set_by drop not null;


-- =======================================
-- migration_v6_tl_attendance.sql
-- =======================================

-- v6: absensi TL (tanpa outlet)
alter table attendance alter column outlet_id drop not null;
create unique index if not exists attendance_tl_user_date_idx
    on attendance (user_id, report_date)
    where outlet_id is null;


-- =======================================
-- migration_v7_ec.sql
-- =======================================

-- v7: EC (Effective Call) per hari, disimpan di laporan sales
alter table daily_sales_reports add column ec integer;


-- =======================================
-- migration_v8_product_image.sql
-- =======================================

-- v8: foto produk untuk input sales + harga paket
alter table products add column if not exists image_url text;

update products set image_url = '/products/aglio-olio.jpg' where lower(variant) like '%aglio%';
update products set image_url = '/products/bolognese.jpg' where lower(variant) like '%bolognese%';
update products set image_url = '/products/carbonara.jpg' where lower(variant) like '%carbonara%';
update products set image_url = '/products/goreng.jpg' where lower(variant) like '%goreng%';

update products set default_price = 4000 where variant like 'BUY 2 GET 1';
update products set default_price = 12000 where variant like 'BUY 6 GRATIS MERCH';


-- =======================================
-- migration_v9_selisih.sql
-- =======================================

-- v9: selisih jadi kolom biasa (diisi aplikasi: stok awal - terjual - stok akhir),
--     bukan generated (awal - akhir) lagi.
alter table daily_stock_reports alter column selisih drop expression;


-- =======================================
-- migration_v10_avatar.sql
-- =======================================

-- v10: foto profil SPG di tabel users (URL public, bucket storage 'avatars').
alter table users add column if not exists avatar_url text;


-- =======================================
-- migration_v11_location_name.sql
-- =======================================

-- location_name: nama alamat dari reverse-geocoding OpenStreetMap saat check-in foto.
-- Kolom saat ini sudah ada di DB produksi (ditambahkan manual) â€” file ini untuk lingkungan baru.
alter table attendance
  add column if not exists location_name text;


-- =======================================
-- migration_v12_monthly_planning.sql
-- =======================================

-- monthly_planning: which outlets are planned to run each month (shared by all PIC + admin)
CREATE TABLE IF NOT EXISTS monthly_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,          -- 'YYYY-MM' e.g. '2026-09'
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_month ON monthly_planning(month);



-- =======================================
-- migration_v13_backup_status.sql
-- =======================================

-- Migration v13: tambah 'backup' ke status users
-- update: status sebelumnya cuma ('active', 'inactive')
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'backup'));



-- =======================================
-- migration_v14_user_delete_fix.sql
-- =======================================

-- Migration v14: user boleh dihapus walau pernah bikin monthly_planning
-- created_by sebelumnya RESTRICT (tanpa ON DELETE) -> blokir delete user.
ALTER TABLE monthly_planning DROP CONSTRAINT IF EXISTS monthly_planning_created_by_fkey;
ALTER TABLE monthly_planning
  ADD CONSTRAINT monthly_planning_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


-- =======================================
-- migration_v15_outlet_aliases.sql
-- =======================================

-- Migration v15: alias nama toko -> outlet untuk disambiguasi saat import user
-- Nama disimpan normalisasi (huruf besar, tanpa spasi/tanda baca) sebagai PK.
CREATE TABLE IF NOT EXISTS outlet_aliases (
  name text PRIMARY KEY,
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outlet_aliases_outlet ON outlet_aliases(outlet_id);


-- =======================================
-- seed_dev.sql
-- =======================================

-- ============================================================
-- Seed data DEV â€” untuk pengujian awal
-- Jalankan SETELAH migration_v1.sql di Supabase SQL Editor
-- ============================================================

INSERT INTO outlets (code_subdist, code_outlet, name, area, grsm, channel_group, target_sellout_value, lat, lng) VALUES
    ('SD01', 'OUT-001', 'KAIRO', 'Jakarta', 'GRSM-A', 'GMM', 0, -6.2, 106.816),
    ('SD01', 'OUT-002', 'MERDEKA', 'Jakarta', 'GRSM-A', 'MT', 0, -6.2, 106.83)
ON CONFLICT (code_outlet) DO NOTHING;

-- Admin BJM
INSERT INTO users (full_name, nip, role, status, assigned_outlet_id, supervisor_id) VALUES
    ('Admin BJM',       '90001', 'admin', 'active', NULL, NULL),
    ('Rina TL',         '90002', 'tl',    'active', NULL, NULL),
    ('Budi SPG',        '10001', 'spg',   'active', (SELECT id FROM outlets WHERE code_outlet='OUT-001'), (SELECT id FROM users WHERE nip='90002')),
    ('Sari SPG',        '10002', 'spg',   'active', (SELECT id FROM outlets WHERE code_outlet='OUT-002'), (SELECT id FROM users WHERE nip='90002'))
ON CONFLICT (nip) DO NOTHING;

-- Test login:
--   Admin = NIP 90001
--   TL    = NIP 90002
--   SPG   = NIP 10001 / 10002
-- Login cukup ketik NIP, tanpa password.
