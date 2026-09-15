# Product Requirement Document (PRD)
## Aplikasi Absensi & Reporting Sales/Stock SPG-TL

**Versi:** 1.0 (Draft)
**Disusun oleh:** Zulham — PT Bistem Jaya Mandiri (BJM)
**Tanggal:** 28 Agustus 2026

---

## 1. Latar Belakang

BJM menangani operasional lapangan khusus untuk brand **WOW JSM (WOW Spaghetti)** dengan tenaga SPG/TL yang tersebar di berbagai outlet dan wilayah. Saat ini belum ada sistem terpusat berbasis web/app (di luar Google Apps Script) untuk:
- Mencatat kehadiran SPG di outlet (in/out).
- Menampung laporan penjualan dan stock harian dari SPG.
- Memvalidasi laporan tersebut sebelum menjadi data final.

Kebutuhan ini muncul untuk menggantikan proses manual/semi-manual agar data lebih akurat, real-time, dan mudah diaudit oleh TL maupun tim pusat BJM.

## 2. Tujuan Produk

1. Menyediakan platform absensi digital yang tervalidasi lokasi untuk SPG.
2. Menstandarkan input laporan sales dan stock harian per outlet/SKU.
3. Memberikan TL kontrol approval sebelum data masuk sebagai data final.
4. Menghasilkan data terstruktur yang bisa diintegrasikan ke dashboard pelaporan yang sudah ada.

## 3. Target Pengguna

| Role | Deskripsi | Akses Utama |
|---|---|---|
| SPG | Sales Promotion Girl/Guy di outlet | Absen in/out, input sales & stock harian |
| TL | Supervisor/koordinator lapangan | Monitoring absensi, approval laporan, rekap performa SPG binaan |
| Admin (BJM) | Pengelola sistem | Master data, export data, role management |

## 4. Spesifikasi Platform

- **Bentuk aplikasi:** Web app berbasis PWA (Progressive Web App), diakses via browser HP tanpa instalasi dari store.
- **Konektivitas:** Selalu online — mode offline **tidak diperlukan** pada versi ini.
- **Approval flow:** Wajib — semua laporan sales & stock dari SPG berstatus *pending* sampai disetujui TL sebelum dianggap final.

## 5. Ruang Lingkup Fitur

### 5.1 Modul Absensi (SPG)
- Check-in dan check-out dengan geotagging (validasi lokasi outlet).
- Foto selfie saat absen sebagai bukti kehadiran.
- Timestamp otomatis dengan status (tepat waktu / terlambat).
- Daftar outlet yang wajib dikunjungi per hari (untuk SPG multi-outlet).

### 5.2 Modul Reporting Sales Harian (SPG)
- Input jumlah unit terjual per SKU.
- Input nominal omzet harian.
- Upload foto struk/bukti transaksi (opsional).
- Riwayat submission untuk pengecekan SPG sendiri.
- Status laporan: Pending → Approved/Rejected oleh TL.

### 5.3 Modul Reporting Stock Harian (SPG)
- Input stock awal dan stock akhir per SKU.
- Kalkulasi otomatis selisih stock.
- Notifikasi/alert internal jika stock mendekati habis.
- Status laporan: Pending → Approved/Rejected oleh TL.

### 5.4 Modul TL (Supervisor)
- Dashboard monitoring absensi real-time SPG binaan (siapa yang sudah/belum absen).
- Antrian approval untuk laporan sales & stock harian.
- Kemampuan reject dengan catatan revisi ke SPG.
- Rekap performa SPG per periode (harian/mingguan/bulanan).

### 5.5 Modul Admin (BJM)
- Master data: outlet, SKU, mapping SPG-TL.
- Manajemen role & akses (SPG, TL, Admin).
- Export data (siap untuk feed ke dashboard existing — WOW JSM).
- Log audit approval/rejection.
- **Import & Sync dari Excel Database Existing (`DATABASE M4 WOW GMM MT JSM.xlsx`):**
  - Admin upload file Excel terbaru kapan saja.
  - Aplikasi baca semua sheet: `AKTIF`, `NON AKTIF`, `BACK UP`.
  - Rekonsiliasi berdasarkan **NIP** sebagai primary key:
    - NIP baru → insert user/outlet otomatis.
    - NIP existing → update data (nama, phone, outlet, dll.).
    - NIP ditemukan di sheet `NON AKTIF` tapi status di DB masih `active` → **flag untuk konfirmasi Admin**.
  - Tampilkan **Preview Screen** sebelum data disimpan: ringkasan user baru, user diupdate, dan daftar SPG yang akan dinonaktifkan beserta nama toko & TL-nya.
  - Admin dapat nonaktifkan semua, pilih manual, atau skip perubahan nonaktif.

## 6. Alur Utama (High-Level Flow)

1. SPG check-in di outlet → sistem validasi lokasi & simpan foto.
2. SPG input laporan sales & stock harian → status *pending*.
3. TL meninjau laporan masuk → approve/reject.
4. Jika approved → data masuk sebagai data final, siap diekspor/diintegrasikan.
5. Jika rejected → SPG mendapat notifikasi beserta catatan revisi TL.
6. SPG check-out di akhir shift.

## 7. Kebutuhan Non-Fungsional

- Aplikasi harus responsif di layar HP (mobile-first).
- Waktu muat halaman cepat mengingat pemakaian di lapangan.
- Data tersimpan aman dengan role-based access control (Supabase RLS).
- Kompatibel dengan integrasi/export ke sistem pelaporan existing milik BJM.
- **Kompresi foto sisi klien sebelum upload**: foto kamera HP (umumnya 2-5 MB) wajib di-resize (maks lebar ~800-1000px) dan di-recompress (JPEG quality ~70-80%) di browser/app sebelum dikirim ke server, target hasil akhir ~150-300 KB per foto.
- **Login:** Nomor HP + NIP. Tidak ada OTP/SMS. Akun dibuat dan dikelola sepenuhnya oleh Admin.
- **Timestamp:** Server-side `timestamptz DEFAULT now()` — tidak mempercayai jam perangkat SPG.

## 8. Keputusan yang Sudah Ditetapkan

| # | Topik | Keputusan |
|---|---|---|
| 1 | Platform | PWA, selalu online |
| 2 | Brand scope | WOW JSM saja |
| 3 | Auth | Login Nomor HP + NIP, gratis, tanpa OTP |
| 4 | Timestamp | `timestamptz` server-side, tidak percaya jam HP |
| 5 | GPS Drift | Bypass diizinkan, flag `location_unverified`, TL review manual |
| 6 | Multi-SPG per outlet | Handled by design (unique per user+outlet+date) |
| 7 | Kontrol harga | TL/Admin set per outlet di `outlet_product_prices` |
| 8 | Rekonsiliasi stok | Boleh selisih, wajib isi `other_qty` + `other_reason` |
| 9 | SLA laporan | Longgar, boleh H+1 |
| 10 | Import user | Dari Excel existing via Admin, sync berbasis NIP, dengan Preview & konfirmasi nonaktif |

## 9. Open Items

- **Mekanisme Paket Promo** (B2G1 & Beli 6): Belum diputuskan cara input qty, kalkulasi omzet, dan pengaruh ke stok. Perlu dibahas sebelum implementasi `daily_sales_reports`.
- Frekuensi rekap performa TL yang ingin ditampilkan (harian/mingguan/bulanan).

## 10. Master Data Awal (Confirmed dari Data Existing)

### SKU Produk WOW Spaghetti
| Variant | Default Price |
|---|---|
| CARBONARA | Rp 2.000/pcs |
| BOLOGNESE | Rp 2.000/pcs |
| AGLIO OLIO | Rp 2.000/pcs |
| GORENG | Rp 2.000/pcs |

*Sumber: `RAW DAILY REPORT GMM WOW SPAGHETTI JSM.xlsx` & `Report WOW GMM JSM W34.xlsx`*

---

*Dokumen ini adalah living document dan diperbarui seiring diskusi.*
