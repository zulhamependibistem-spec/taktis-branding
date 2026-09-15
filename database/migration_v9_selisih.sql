-- v9: selisih jadi kolom biasa (diisi aplikasi: stok awal - terjual - stok akhir),
--     bukan generated (awal - akhir) lagi.
alter table daily_stock_reports alter column selisih drop expression;