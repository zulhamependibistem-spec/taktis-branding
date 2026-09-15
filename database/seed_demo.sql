-- ============================================================
-- Seed demo — data contoh untuk preview / testing
-- Jalankan SETELAH seed_dev.sql di Supabase SQL Editor
-- (pakai ID yang sudah ter-insert di DB kamu)
-- ============================================================

-- 0. Perbaiki supervisor_id SPG -> Rina TL, biar flow TL/approval hidup
UPDATE users SET supervisor_id = '057a53ac-956f-459c-a7bb-fabda54e0ca1'
WHERE id IN ('c5f80610-0139-424b-a04a-2ef790cd3254', '5637c41f-1945-4a01-8ffe-6b8f0f0d9f24');

-- 1. Absensi hari ini (Budi sudah check-out, Sari baru check-in)
INSERT INTO attendance
    (user_id, outlet_id, report_date, check_in_time, check_out_time, check_in_lat, check_in_lng, status)
VALUES
    ('c5f80610-0139-424b-a04a-2ef790cd3254', 'ed77de38-eaf4-47e0-a4bd-5107a7d4a287', CURRENT_DATE,
     (CURRENT_TIMESTAMP - INTERVAL '8 hours'), (CURRENT_TIMESTAMP - INTERVAL '2 hours'), -6.2, 106.816, 'checked_out'),
    ('5637c41f-1945-4a01-8ffe-6b8f0f0d9f24', '2260da1e-f6ad-49dd-94d2-09dd4e1876dc', CURRENT_DATE,
     (CURRENT_TIMESTAMP - INTERVAL '1 hour'), NULL, -6.2, 106.83, 'checked_in')
ON CONFLICT (user_id, outlet_id, report_date) DO NOTHING;

-- 2. Laporan sales beberapa hari terakhir + 1 pending hari ini (buat approval TL)
INSERT INTO daily_sales_reports
    (user_id, outlet_id, product_id, report_date, qty_sold, unit_price, total_selling, sampling_qty, status, notes, approved_by, approved_at)
SELECT v.user_id, u.assigned_outlet_id, p.id, v.rdate, v.qty, p.default_price, v.qty*p.default_price, v.samp, v.st, v.notes, v.tl, v.app
FROM (VALUES
    ('c5f80610-0139-424b-a04a-2ef790cd3254', CURRENT_DATE - 3, 120, 5, 'approved', NULL, (SELECT id FROM users WHERE nip='90002'), (CURRENT_TIMESTAMP - INTERVAL '3 days')),
    ('c5f80610-0139-424b-a04a-2ef790cd3254', CURRENT_DATE - 2, 90, 2, 'approved', NULL, (SELECT id FROM users WHERE nip='90002'), (CURRENT_TIMESTAMP - INTERVAL '2 days')),
    ('c5f80610-0139-424b-a04a-2ef790cd3254', CURRENT_DATE - 1, 110, 0, 'rejected', 'Struk buram, tolong resubmit.', NULL, NULL),
    ('5637c41f-1945-4a01-8ffe-6b8f0f0d9f24', CURRENT_DATE - 2, 75, 3, 'approved', NULL, (SELECT id FROM users WHERE nip='90002'), (CURRENT_TIMESTAMP - INTERVAL '2 days')),
    ('5637c41f-1945-4a01-8ffe-6b8f0f0d9f24', CURRENT_DATE - 1, 60, 1, 'approved', NULL, (SELECT id FROM users WHERE nip='90002'), (CURRENT_TIMESTAMP - INTERVAL '1 day'))
) AS v(user_id, rdate, qty, samp, st, notes, tl, app)
JOIN users u ON u.id = v.user_id
CROSS JOIN products p
WHERE p.variant = 'CARBONARA'
ON CONFLICT DO NOTHING;

-- 3. Satu laporan sales PENDING hari ini (buat disetujui/ditolak TL)
INSERT INTO daily_sales_reports
    (user_id, outlet_id, product_id, report_date, qty_sold, unit_price, total_selling, sampling_qty, status)
SELECT 'c5f80610-0139-424b-a04a-2ef790cd3254', 'ed77de38-eaf4-47e0-a4bd-5107a7d4a287', p.id,
       CURRENT_DATE, 88, p.default_price, 88*p.default_price, 4, 'pending'
FROM products p WHERE p.variant = 'BOLOGNESE'
ON CONFLICT DO NOTHING;

-- 4. Laporan stok + 1 pending hari ini
INSERT INTO daily_stock_reports
    (user_id, outlet_id, product_id, report_date, stock_awal, stock_akhir, selisih, other_qty, other_reason, status)
SELECT 'c5f80610-0139-424b-a04a-2ef790cd3254', 'ed77de38-eaf4-47e0-a4bd-5107a7d4a287', p.id,
       CURRENT_DATE - 1, 50, 30, 20, 2, '2 unit expired', 'approved'
FROM products p WHERE p.variant = 'CARBONARA'
ON CONFLICT DO NOTHING;
