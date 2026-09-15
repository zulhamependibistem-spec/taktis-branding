-- v5: perf + konsistensi
-- export/omzet admin scan by report_date saja (tanpa user_id) -> butuh index terpisah
create index if not exists idx_sales_reporter_date on daily_sales_reports (report_date);
create index if not exists idx_stock_reporter_date on daily_stock_reports (report_date);

-- set_by NOT NULL + ON DELETE SET NULL saling kontradiksi
alter table outlet_product_prices alter column set_by drop not null;