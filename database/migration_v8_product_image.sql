-- v8: foto produk untuk input sales + harga paket
alter table products add column if not exists image_url text;

update products set image_url = '/products/aglio-olio.jpg' where lower(variant) like '%aglio%';
update products set image_url = '/products/bolognese.jpg' where lower(variant) like '%bolognese%';
update products set image_url = '/products/carbonara.jpg' where lower(variant) like '%carbonara%';
update products set image_url = '/products/goreng.jpg' where lower(variant) like '%goreng%';

update products set default_price = 4000 where variant like 'BUY 2 GET 1';
update products set default_price = 12000 where variant like 'BUY 6 GRATIS MERCH';