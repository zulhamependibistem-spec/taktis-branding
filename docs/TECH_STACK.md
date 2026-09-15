# Tech Stack Decision
## Aplikasi Absensi & Reporting SPG-TL — WOW JSM

**Tanggal:** 28 Agustus 2026

---

## Stack Utama

| Layer | Pilihan | Alasan |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router) | SSR + PWA support, optimal untuk mobile, ekosistem terlengkap |
| **Bahasa** | TypeScript | Type safety, mencegah bug runtime di field-field DB |
| **Styling** | Tailwind CSS | Utility-first, cepat untuk mobile-first UI |
| **Backend & Database** | Supabase (PostgreSQL) | Auth, DB, Storage, RLS, Realtime — satu platform |
| **Hosting** | Vercel | Zero-config deploy untuk Next.js, free tier cukup untuk skala ini |
| **Image Compression** | `browser-image-compression` | Library ringan, jalan di browser tanpa server, cocok untuk HP low-end |
| **PWA** | `next-pwa` | Service worker otomatis untuk Next.js, installable dari browser HP |

---

## Detail Keputusan

### Frontend — Next.js 14 (App Router)
- **Mobile-first**: Semua halaman didesain untuk layar HP (≤ 390px sebagai breakpoint utama).
- **PWA**: Bisa di-"Add to Home Screen" dari browser HP tanpa install dari Play Store/App Store.
- **Server Actions**: Logika bisnis (kalkulasi harga, validasi stok) dijalankan di server, bukan di klien — lebih aman.
- **Route Groups**: Folder struktur terpisah per role (`(spg)`, `(tl)`, `(admin)`) untuk isolasi halaman dan middleware auth.

### Backend — Supabase
- **Auth**: Custom auth via `phone` + `nip` (bukan OTP). Implementasi lewat Supabase Auth dengan custom claims atau tabel `users` sendiri + JWT manual.
- **Storage**: Foto absensi disimpan di Supabase Storage bucket `attendance-photos`. URL disimpan di tabel `attendance`.
- **RLS (Row-Level Security)**: Semua tabel dilindungi policy RLS sesuai role.
- **Realtime**: Digunakan untuk dashboard TL (monitoring absensi real-time).

### Image Compression — `browser-image-compression`
- Resize otomatis ke lebar maks **1000px**.
- Recompress ke **JPEG quality 75%**.
- Target output: **< 300 KB per foto**.
- Berjalan sepenuhnya di browser — tidak ada foto ukuran besar yang pernah meninggalkan HP SPG.

### PWA Setup
- `next-pwa` generate `manifest.json` dan service worker otomatis.
- Icon aplikasi custom (WOW JSM branding).
- **Offline**: Tidak diperlukan (sesuai keputusan PRD) — service worker hanya untuk installability.
- SPG cukup buka browser HP → buka URL → "Add to Home Screen" → selesai.

---

## Struktur Folder Next.js (Rencana)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (spg)/
│   │   ├── attendance/       # Check-in / Check-out
│   │   ├── sales/            # Input laporan sales
│   │   └── stock/            # Input laporan stok
│   ├── (tl)/
│   │   ├── dashboard/        # Monitoring absensi real-time
│   │   ├── approval/         # Antrian approve/reject
│   │   └── performance/      # Rekap performa SPG
│   └── (admin)/
│       ├── users/            # Manajemen user
│       ├── outlets/          # Manajemen outlet
│       ├── products/         # Manajemen SKU & harga
│       └── import/           # Import & sync Excel
├── components/
├── lib/
│   ├── supabase/
└── middleware.ts             # Auth guard per role
```

---

## Batasan & Catatan

- **Tidak ada mode offline** — semua fitur butuh koneksi internet.
- **Minimum browser**: Chrome 90+ / Safari 14+ di HP Android/iOS.
- **Minimum RAM HP**: Tested pada perangkat 2GB RAM (target SPG lapangan).
- Paket promo (B2G1, Beli 6, Merchandise) belum diimplementasi sampai keputusan bisnis final — akan ditambah sebagai modul terpisah.
