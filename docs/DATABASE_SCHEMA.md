# Database Schema — Aplikasi Absensi & Reporting SPG-TL

**Database:** Supabase (PostgreSQL)
**Versi:** 1.0 (Draft)
**Tanggal:** 28 Agustus 2026

Skema ini diturunkan dari struktur data report existing (WOW GMM JSM weekly report) dan kebutuhan user provisioning oleh TL/TL.

---

## 1. Ringkasan Tabel

| Tabel | Fungsi |
|---|---|
| `outlets` | Master data toko/outlet |
| `products` | Master data SKU/varian produk |
| `users` | Akun SPG, TL, dan Admin |
| `attendance` | Log absensi in/out SPG per outlet |
| `daily_sales_reports` | Laporan penjualan harian per SPG per SKU |
| `daily_stock_reports` | Laporan stock harian per SPG per SKU |

---

## 2. Detail Tabel

### 2.1 `outlets`
Master data toko, mengikuti struktur sheet "KET" dan "Kode Outlet dan Target Toko" di report existing.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| code_subdist | text | Kode subdistrik |
| code_outlet | text | Kode outlet unik |
| name | text | Nama toko |
| area | text | Area/kota |
| grsm | text | Kode GRSM (wilayah supervisi) |
| channel_group | text | GMM / MT / NKA, dst |
| target_sellout_value | numeric | Target sell out harian (Rp) |
| created_at | timestamp | |

### 2.2 `products`
Master SKU/varian produk WOW JSM (mis. WOW Spaghetti Carbonara, Bolognese, Aglio Olio, Goreng, dll.).

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| name | text | Nama produk (Default: "WOW Spaghetti") |
| variant | text | Varian (Carbonara, Bolognese, Aglio Olio, Goreng, dst) |
| default_price | numeric | Harga jual default per SKU |
| is_active | boolean | |

### 2.3 `users`
Menyimpan SPG, TL, dan Admin dalam satu tabel dibedakan lewat `role`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| full_name | text | |
| nip | text (UNIQUE) | NIP dari sistem BJM existing — input manual Admin. Dipakai sebagai password login |
| phone | text (UNIQUE) | Nomor HP — dipakai sebagai username login |
| role | text | `spg` / `tl` / `admin` |
| status | text | `active` / `inactive` — SPG resign di-set inactive, **tidak dihapus**, supaya histori laporan tetap valid |
| assigned_outlet_id | uuid (FK → outlets.id) | Outlet tempat SPG bertugas |
| supervisor_id | uuid (FK → users.id) | TL yang menaungi SPG ini |
| created_at | timestamptz | `DEFAULT now()` (Server-side timestamp) |

**Login:** Nomor HP + NIP. Berlaku untuk semua role (SPG tetap, SPG backup, TL, Admin).
**Alur provisioning:** hanya `tl` atau `admin` yang bisa membuat akun `spg` baru. SPG tidak bisa self-register.

### 2.4 `attendance`
Log absensi in/out. Menggunakan timestamp otomatis sisi server (`timestamptz` dengan `DEFAULT now()`) untuk mencegah manipulasi waktu oleh SPG melalui pengaturan jam HP.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users.id) | |
| outlet_id | uuid (FK → outlets.id) | |
| check_in_time | timestamptz | `DEFAULT now()` saat insert (Server-side timestamp) |
| check_in_photo_url | text | |
| check_in_lat / check_in_lng | numeric | Geotagging validasi lokasi |
| check_out_time | timestamptz | Di-set `now()` saat update check-out (Server-side timestamp) |
| check_out_photo_url | text | |
| status | text | `on_time` / `late` / `location_unverified` (Kalkulasi otomatis saat insert) |
| location_bypass_reason | text | Diisi SPG jika GPS meleset — alasan bypass lokasi untuk ditinjau TL |

**Nilai status:**
| Status | Kondisi |
|---|---|
| `on_time` | Check-in tepat waktu, GPS valid dalam radius outlet |
| `late` | Check-in terlambat, GPS valid dalam radius outlet |
| `location_unverified` | GPS meleset saat check-in, butuh review TL — SPG wajib isi `location_bypass_reason` |

**Aturan alur (wajib ditegakkan di server, bukan cuma di UI):**
- Satu SPG hanya boleh punya **satu baris attendance per outlet per `report_date`** — ditegakkan lewat **unique constraint** pada kombinasi `(user_id, outlet_id, report_date)`.
- Baris ini diisi bertahap: `check_in_*` diisi lebih dulu (insert), baru kemudian `check_out_*` diisi (update) — bukan bikin baris baru.
- **Check-in kedua ditolak**: kalau `check_in_time` sudah terisi untuk kombinasi tsb, request check-in baru mengembalikan error, bukan menimpa foto/waktu yang lama.
- **Check-out ditolak kalau `check_in_time` masih null**: server harus validasi ini sebelum menerima foto/waktu check-out.
- Status harian: `not_checked_in` → `checked_in` (setelah in terisi) → `checked_out` (setelah out terisi). Setelah `checked_out`, hari itu selesai — tidak ada aksi lagi untuk kombinasi user+outlet+tanggal tsb.

### 2.5 `daily_sales_reports`
Satu baris = satu SPG, satu outlet, satu SKU, satu tanggal — mengikuti granularitas sheet "DAILY REPORT" di file existing.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users.id) | SPG pelapor |
| outlet_id | uuid (FK → outlets.id) | |
| product_id | uuid (FK → products.id) | |
| report_date | date | |
| qty_sold | integer | Input manual SPG |
| unit_price | numeric | Diisi otomatis server dari `outlet_product_prices`, fallback ke `products.default_price` |
| total_selling | numeric | **Dihitung otomatis** (qty_sold × unit_price), jangan input manual |
| sampling_qty | integer | Opsional, jumlah sampling yang keluar |
| status | text | `pending` / `approved` / `rejected` |
| approved_by | uuid (FK → users.id) | TL yang approve |
| approved_at | timestamptz | Di-set `now()` oleh server saat status diubah menjadi approved |
| notes | text | Catatan revisi dari TL jika reject |

### 2.6 `daily_stock_reports`
Satu baris = satu SPG, satu outlet, satu SKU, satu tanggal.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users.id) | |
| outlet_id | uuid (FK → outlets.id) | |
| product_id | uuid (FK → products.id) | |
| report_date | date | |
| stock_awal | integer | |
| stock_akhir | integer | |
| selisih | integer | **Dihitung otomatis** (stock_awal − stock_akhir) |
| other_qty | integer | Unit yang tidak terjual & bukan sampling (rusak, retur, expired, hilang) — opsional, diisi jika `selisih ≠ qty_sold + sampling_qty` |
| other_reason | text | Alasan `other_qty` — wajib diisi jika `other_qty > 0` (contoh: "2 unit pecah", "1 unit expired") |
| status | text | `pending` / `approved` / `rejected` |
| approved_by | uuid (FK → users.id) | |
| approved_at | timestamptz | Di-set `now()` oleh server saat status diubah menjadi approved |

### 2.7 `outlet_product_prices`
Override harga SKU per outlet. Di-set oleh TL atau Admin. SPG tidak pernah input harga — `unit_price` di `daily_sales_reports` diisi otomatis oleh server dari tabel ini, dengan fallback ke `products.default_price` jika tidak ada baris yang cocok.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| outlet_id | uuid (FK → outlets.id) | |
| product_id | uuid (FK → products.id) | |
| price | numeric | Harga jual aktif di outlet ini |
| set_by | uuid (FK → users.id) | Harus role `tl` atau `admin` |
| created_at | timestamptz | `DEFAULT now()` |

**Constraint:** `UNIQUE (outlet_id, product_id)` — satu harga aktif per outlet per SKU.

**Logika harga saat SPG submit laporan sales:**
1. Server cek `outlet_product_prices` untuk kombinasi `outlet_id` + `product_id`.
2. Jika ada → pakai `price` dari tabel ini.
3. Jika tidak ada → fallback ke `products.default_price`.

---

## 3. Relasi Utama

- Satu **outlet** punya banyak **users** (SPG yang ditugaskan), **attendance**, **daily_sales_reports**, dan **daily_stock_reports**.
- Satu **product** dipakai di banyak **daily_sales_reports**, **daily_stock_reports**, dan **outlet_product_prices**.
- Satu **user** (TL) mengawasi banyak **user** lain (SPG) lewat `supervisor_id` — relasi self-referencing.
- Satu **user** (SPG) submit banyak **attendance**, **daily_sales_reports**, **daily_stock_reports**.
- Satu **user** (TL) meng-approve banyak **daily_sales_reports** / **daily_stock_reports** lewat `approved_by`.
- Satu **user** (TL/Admin) set harga di banyak **outlet_product_prices** lewat `set_by`.

Diagram lengkap ada di file `schema-erd.mermaid`.

## 4. Storage Foto (Supabase Storage)

Foto absen (`check_in_photo_url`, `check_out_photo_url`) **tidak disimpan di dalam database** — hanya URL/path-nya. File foto sendiri disimpan di Supabase Storage (object storage terpisah).

**Kompresi wajib sebelum upload:**
- Foto asli dari kamera HP umumnya 2-5 MB.
- Sebelum dikirim ke server, foto wajib di-resize (lebar maks ~800-1000px) dan di-recompress (JPEG quality ~70-80%) di sisi klien.
- Target ukuran akhir: ~150-300 KB per foto.

**Estimasi kapasitas** (asumsi 200 SPG, 2 foto/hari — check-in & check-out):
| Skenario | Ukuran/foto | Estimasi/tahun |
|---|---|---|
| Tanpa kompresi | ~2 MB | ~290 GB/tahun |
| Dengan kompresi | ~250 KB | ~36 GB/tahun |

**Retention policy (disarankan):** foto absen yang lebih lama dari 3-6 bulan bisa di-arsipkan atau dihapus otomatis, karena kebutuhan utamanya adalah validasi jangka pendek, bukan arsip permanen.

## 5. Catatan Row-Level Security (RLS)

- SPG hanya bisa `SELECT`/`INSERT` pada baris dengan `user_id` = dirinya sendiri, dan hanya untuk `outlet_id` yang ada di `assigned_outlet_id`-nya.
- TL hanya bisa `SELECT`/`UPDATE` (approve/reject) pada baris milik SPG dengan `supervisor_id` = dirinya.
- Admin punya akses penuh ke semua tabel.
