-- ============================================================
-- Seed data DEV — untuk pengujian awal
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
