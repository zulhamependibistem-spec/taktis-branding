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

COMMENT ON COLUMN attendance.status IS 'not_checked_in → on_time/late/location_unverified → checked_out';
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
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================
