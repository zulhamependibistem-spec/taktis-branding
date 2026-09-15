-- ============================================================
-- WOW JSM SPG Attendance & Reporting App
-- Database Migration v2.0
-- Simplifikasi status attendance sesuai keputusan bisnis:
--   - Tidak ada on_time / late / location_unverified
--   - Tidak ada validasi GPS radius / bypass lokasi
--   - GPS tetap dicatat (lat/lng) sebagai informasi, bukan validasi
-- Status attendance: not_checked_in → checked_in → checked_out
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

-- 3. Kolom bypass lokasi tidak dipakai lagi — hapus
ALTER TABLE attendance
    DROP COLUMN IF EXISTS location_bypass_reason;

-- 4. Update RLS policy lama yang merefer status location_unverified
--    (tidak ada query mandatori; policy SELECT utk TL tetap valid)

-- DONE
