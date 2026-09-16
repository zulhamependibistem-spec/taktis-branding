-- ============================================================
-- Migration v16: HAPUS KONSEP OUTLET TOTAL
-- Keputusan bisnis: project absen-only, tidak butuh master outlet.
--   - Drop tabel: outlets, user_outlets, outlet_aliases,
--     outlet_product_prices, monthly_planning
--   - Drop kolom outlet_id pada: attendance, daily_sales_reports,
--     daily_stock_reports
--   - Drop kolom users.assigned_outlet_id
--   - Drop fungsi helper get_my_outlet_id()
--   - Attendance unik cukup (user_id, report_date)
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Recreate policy attendance_spg_own TANPA outlet
--    (kondisi lama: user_id = get_my_id() AND outlet_id = get_my_outlet_id())
-- ------------------------------------------------------------
drop policy if exists attendance_spg_own on attendance;
create policy attendance_spg_own on attendance
  for all using (user_id = get_my_id());

-- ------------------------------------------------------------
-- 2. Daily sales / stock: lepas FK & index & unique constraint
--    yang menyertakan outlet_id, lalu drop kolom
-- ------------------------------------------------------------
alter table daily_sales_reports drop constraint if exists daily_sales_reports_outlet_id_fkey;
drop index if exists idx_sales_outlet_date;
alter table daily_sales_reports
  drop constraint if exists daily_sales_reports_user_id_outlet_id_product_id_report_dat_key;
alter table daily_sales_reports drop column if exists outlet_id;
alter table daily_sales_reports
  add constraint daily_sales_reports_user_id_product_id_report_date_key
  unique (user_id, product_id, report_date);

alter table daily_stock_reports drop constraint if exists daily_stock_reports_outlet_id_fkey;
drop index if exists idx_stock_outlet_date;
alter table daily_stock_reports
  drop constraint if exists daily_stock_reports_user_id_outlet_id_product_id_report_dat_key;
alter table daily_stock_reports drop column if exists outlet_id;
alter table daily_stock_reports
  add constraint daily_stock_reports_user_id_product_id_report_date_key
  unique (user_id, product_id, report_date);

-- ------------------------------------------------------------
-- 3. Attendance: lepas FK / index / unique constraint, drop kolom
-- ------------------------------------------------------------
alter table attendance drop constraint if exists attendance_outlet_id_fkey;
drop index if exists attendance_tl_user_date_idx;
drop index if exists idx_attendance_outlet_date;
alter table attendance
  drop constraint if exists attendance_user_id_outlet_id_report_date_key;
alter table attendance drop column if exists outlet_id;
alter table attendance
  add constraint attendance_user_id_report_date_key unique (user_id, report_date);

-- ------------------------------------------------------------
-- 4. Users: drop kolom assigned_outlet_id
-- ------------------------------------------------------------
alter table users drop constraint if exists users_assigned_outlet_id_fkey;
drop index if exists idx_users_outlet;
alter table users drop column if exists assigned_outlet_id;

-- ------------------------------------------------------------
-- 5. Drop tabel yang murni outlet
-- ------------------------------------------------------------
drop table if exists monthly_planning;
drop table if exists outlet_aliases;
drop table if exists outlet_product_prices;
drop table if exists user_outlets;
drop table if exists outlets;

-- ------------------------------------------------------------
-- 6. Drop helper get_my_outlet_id()
-- ------------------------------------------------------------
drop function if exists get_my_outlet_id();

-- ------------------------------------------------------------
-- 7. Re-seed admin (users habis dibersihkan saat import real dibatalkan)
--    Login: NIP saja.
-- ------------------------------------------------------------
insert into users (full_name, nip, role, status)
values ('Admin BJM', '90001', 'admin', 'active')
on conflict (nip) do nothing;

commit;