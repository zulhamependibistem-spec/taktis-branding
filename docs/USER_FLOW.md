# User Flow
## Aplikasi Absensi & Reporting SPG-TL — WOW JSM

**Tanggal:** 28 Agustus 2026

---

## 1. Alur Login (Semua Role)

```mermaid
flowchart TD
    A([Buka Aplikasi]) --> B[Halaman Login]
    B --> C[Input Nomor HP + NIP]
    C --> D{Validasi Server}
    D -->|Gagal| E[Tampil pesan error]
    E --> C
    D -->|Berhasil| F{Cek Role}
    F -->|spg| G([Halaman SPG])
    F -->|tl| H([Halaman TL])
    F -->|admin| I([Halaman Admin])
```

---

## 2. Alur SPG

### 2.1 Check-In

```mermaid
flowchart TD
    A([Buka Halaman Absensi]) --> B{Sudah check-in hari ini?}
    B -->|Ya| C[Tampil status: Sudah Check-In\nTombol Check-Out aktif]
    B -->|Tidak| D[Tombol Check-In]
    D --> E[Ambil foto selfie]
    E --> F[Kompres foto di browser\nmaks 1000px, JPEG 75%]
    F --> G[Ambil koordinat GPS]
    G --> H{GPS dalam radius outlet?}
    H -->|Ya| I[Submit ke server]
    H -->|Tidak| J[Tampil dialog:\nGPS tidak terdeteksi di lokasi outlet.\nMasukkan alasan bypass]
    J --> K[SPG isi alasan bypass]
    K --> I
    I --> L[Server catat check_in_time = now\nStatus: checked_in]
    L --> O([Selesai - Tampil status Check-In])
```

### 2.2 Input Laporan Sales Harian

```mermaid
flowchart TD
    A([Buka Halaman Sales]) --> B[Tampil daftar SKU outlet\nCARBONARA / BOLOGNESE / AGLIO OLIO / GORENG]
    B --> C[SPG input qty_sold per SKU]
    C --> D[SPG input sampling_qty per SKU opsional]
    D --> E[unit_price otomatis dari server\noutlet_product_prices atau default]
    E --> F[total_selling = qty_sold x unit_price\ndihitung otomatis]
    F --> G[SPG submit laporan]
    G --> H[Server simpan laporan]
    H --> I([Selesai])
```

### 2.3 Input Laporan Stok Harian

```mermaid
flowchart TD
    A([Buka Halaman Stok]) --> B[Tampil daftar SKU outlet]
    B --> C[SPG input stock_awal per SKU]
    C --> D[SPG input stock_akhir per SKU]
    D --> E[selisih = stock_awal - stock_akhir\ndihitung otomatis]
    E --> F{selisih = qty_sold + sampling_qty?}
    F -->|Ya| H[Submit laporan]
    F -->|Tidak| G[Tampil peringatan:\nAda selisih stok tidak terhitung.\nMasukkan qty dan alasan]
    G --> G2[SPG isi other_qty + other_reason]
    G2 --> H
    H --> I[Server simpan laporan stok]
    I --> J([Selesai])
```

### 2.4 Check-Out

```mermaid
flowchart TD
    A([Buka Halaman Absensi]) --> B{Sudah check-in?}
    B -->|Tidak| C[Tombol Check-Out nonaktif]
    B -->|Ya| D[Tombol Check-Out aktif]
    D --> E[Ambil foto selfie]
    E --> F[Kompres foto di browser]
    F --> G[Submit ke server]
    G --> H[Server catat check_out_time = now]
    H --> I([Selesai - Hari ini selesai])
```

---

## 3. Alur TL

### 3.1 Dashboard Monitoring Absensi

```mermaid
flowchart TD
    A([Buka Dashboard TL]) --> B[Tampil daftar SPG binaan]
    B --> C{Status absensi hari ini}
    C -->|checked_in| D[Tampil: Sudah masuk - jam check-in]
    C -->|checked_out| E[Tampil: Sudah selesai - jam in & out]
    C -->|not_checked_in| F[Tampil: Belum absen]
    C -->|location_unverified| G[Tampil: GPS tidak terverifikasi\nFlag merah - butuh review]
    G --> H[TL lihat foto selfie + koordinat]
    H --> I{Keputusan TL}
    I -->|Valid| J[TL tandai sebagai verified]
    I -->|Tidak Valid| K[TL hubungi SPG manual]
```

### 3.2 Set Harga SKU per Outlet

```mermaid
flowchart TD
    A([Buka Halaman Harga Outlet]) --> B[Pilih outlet]
    B --> C[Tampil daftar SKU + harga saat ini\nharga default jika belum di-set]
    C --> D[TL ubah harga SKU tertentu]
    D --> E[Simpan ke outlet_product_prices]
    E --> F([Berlaku untuk laporan sales SPG berikutnya])
```

---

## 4. Alur Admin

### 4.1 Import & Sync Data dari Excel

```mermaid
flowchart TD
    A([Buka Halaman Import]) --> B[Upload file Excel\nDATABASE M4 WOW GMM MT JSM.xlsx]
    B --> C[Server parse semua sheet:\nAKTIF + NON AKTIF + BACK UP]
    C --> D[Rekonsiliasi berdasarkan NIP]
    D --> E[Tampil Preview Screen]
    E --> E1[Daftar user baru]
    E --> E2[Daftar user diupdate]
    E --> E3[Daftar SPG terdeteksi NONAKTIF]
    E3 --> F{Admin pilih aksi untuk yang NONAKTIF}
    F -->|Nonaktifkan Semua| G[Set status = inactive semua]
    F -->|Pilih Manual| H[Admin centang satu per satu]
    F -->|Skip| I[Abaikan perubahan nonaktif]
    G --> J[Simpan ke database]
    H --> J
    I --> J
    J --> K([Selesai - Data tersinkronisasi])
```

### 4.2 Manajemen User Manual

```mermaid
flowchart TD
    A([Buka Halaman Users]) --> B[Tampil daftar semua user]
    B --> C{Aksi Admin}
    C -->|Tambah User| D[Input: nama, NIP, phone, role, outlet, supervisor]
    D --> E[Simpan ke DB]
    C -->|Edit User| F[Ubah data user]
    F --> E
    C -->|Nonaktifkan| G[Set status = inactive]
    G --> E
    E --> H([Selesai])
```

### 4.3 Manajemen Outlet & SKU

```mermaid
flowchart TD
    A([Buka Halaman Outlets/Products]) --> B{Pilih modul}
    B -->|Outlets| C[CRUD outlet\nnama, area, GRSM, kode, target sellout]
    B -->|Products| D[CRUD SKU\nnama, variant, default_price, is_active]
    C --> E([Simpan])
    D --> E
```

### 4.4 Export Data

```mermaid
flowchart TD
    A([Buka Halaman Export]) --> B[Pilih rentang tanggal]
    B --> C[Pilih outlet atau semua]
    C --> D[Generate Excel / CSV]
    D --> E[File siap download\nFormat kompatibel dengan dashboard WOW JSM existing]
```

---

## 5. Ringkasan Status per Entitas

### Status Absensi (`attendance.status`)
| Status | Kondisi |
|---|---|
| `not_checked_in` | Belum absen |
| `checked_in` | Sudah check-in (belum check-out) |
| `checked_out` | Check-in & check-out selesai |

### Status Laporan (`daily_sales_reports.status` & `daily_stock_reports.status`)
| Status | Kondisi |
|---|---|
| `approved` | Selalu — laporan langsung final saat submit (tanpa pending/approved/rejected) |

### Status User (`users.status`)
| Status | Kondisi |
|---|---|
| `active` | SPG/TL aktif bertugas |
| `inactive` | Resign/nonaktif — data historis tetap tersimpan |
