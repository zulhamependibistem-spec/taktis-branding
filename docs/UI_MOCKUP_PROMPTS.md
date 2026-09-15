# UI Mockup Prompts — Figma
## Aplikasi Absensi & Reporting SPG-MPP WOW JSM

**Referensi visual:** Inventra (Plus Jakarta Sans, Slate palette, Indigo accent, Glass cards)
**Target device:** Mobile-first, 390×844px (iPhone 14 Pro). Tablet untuk halaman Admin.

---

## Design System (Pakai di semua halaman)

```
Font        : Plus Jakarta Sans (300/400/500/600/700/800)
Mono        : JetBrains Mono (untuk angka qty/harga)
Background  : #f8fafc (slate-50)
Surface     : #ffffff, border #e2e8f0, shadow: 0 1px 3px rgba(0,0,0,0.04)
Text primary: #0f172a (slate-900)
Text muted  : #64748b (slate-500)
Accent      : #4f46e5 (indigo-600)
Accent light: #eef2ff (indigo-50)
Success     : #10b981 (emerald-500)
Warning     : #f59e0b (amber-500)
Danger      : #f43f5e (rose-500)
Border-r    : rounded-xl (12px) card, rounded-2xl (16px) modal
Status pills: rounded-full, bold 700, border 1px
Login BG    : gradient #0f172a → #1e1b4b
```

---

## HALAMAN SPG

---

### 1. Login Screen
```
Mobile screen 390x844px. Dark background gradient top-left #0f172a 
to bottom-right #1e1b4b. Center-aligned vertically and horizontally.

Top: small logo "WOW JSM" white bold 20px, subtitle "Sistem Absensi & Laporan SPG" 
slate-400 12px. Gap 32px below.

Card: frosted glass, background white 8% opacity, border 1px rgba(255,255,255,0.12), 
border-radius 24px, padding 28px, width 340px.

Inside card:
- Label "Nomor HP" white 12px 600 weight above input
- Input field: background white 10%, border 1px rgba(255,255,255,0.15), 
  rounded-xl, height 48px, text white, placeholder slate-400
- Label "NIP" same style
- Input NIP same style, type password (dots)
- Button "Masuk" full-width, height 52px, background indigo-600 #4f46e5, 
  text white bold, rounded-xl, no border

Bottom: "WOW JSM · PT Bistem Jaya Mandiri" slate-600 text 11px centered.
Font: Plus Jakarta Sans. Zero decoration. Ultra minimal dark.
```

---

### 2. SPG Home / Absensi
```
Mobile 390x844px. Background #f8fafc.

Status bar area 16px top padding.

Header section (white, border-bottom #e2e8f0, padding 16px 20px):
- "Selamat pagi 👋" slate-500 13px
- "[Nama SPG]" slate-900 bold 18px
- Outlet name "KAIRO" indigo-600 13px 600 weight
- Right side: date badge "Kam, 28 Agu" indigo-50 background, 
  indigo-600 text, rounded-full, 12px

Main content padding 20px, gap 16px:

Card 1 — Status Absensi (glass-card, rounded-2xl, padding 20px):
- Row: icon clock indigo + "Belum Check-In" slate-700 16px bold
- Subtext: "Wajib check-in sebelum input laporan" slate-400 12px
- Divider slate-100
- Big button "CHECK IN SEKARANG" full-width height 56px 
  indigo-600 rounded-xl text white bold 15px
  With camera icon left of text

Card 2 — Laporan Hari Ini (glass-card, rounded-2xl, padding 16px):
- Title "Laporan Hari Ini" slate-700 14px 600
- 2 rows: 
  Row 1: "Sales" label + status pill "Belum Disubmit" slate border
  Row 2: "Stok" label + status pill "Belum Disubmit" slate border
- Button "Input Laporan" outline indigo, rounded-xl, full-width, height 44px

Bottom nav bar (white, border-top #e2e8f0, height 64px, fixed bottom):
4 icons centered: Home (active indigo), Sales, Stok, Profil
Active icon indigo-600 with dot below, inactive slate-400.
Font: Plus Jakarta Sans.
```

---

### 3. SPG Check-In Flow — Kamera & GPS
```
Mobile 390x844px. Background #0f172a dark.

Full-screen camera viewfinder simulation (dark gray #1e293b fill as placeholder).
Oval face guide overlay center: dashed white oval stroke, 
text "Posisikan wajah di sini" white 13px below oval.

Top bar (transparent, padding 16px):
- Back arrow white left
- "Foto Selfie Check-In" white bold center
- Empty right

Bottom sheet (white, rounded-t-3xl, padding 24px, height 220px):
- GPS status row: icon location indigo + "Lokasi Terdeteksi: KAIRO" emerald-600 13px
  OR icon warning rose + "GPS tidak terdeteksi di area outlet" rose-600 13px
- If GPS invalid: text area input "Alasan bypass lokasi..." 
  slate-200 background, rounded-xl, 3 rows
- Button "Ambil Foto & Check-In" full-width indigo-600 height 52px rounded-xl
Font: Plus Jakarta Sans.
```

---

### 4. SPG Input Laporan Sales
```
Mobile 390x844px. Background #f8fafc.

Header (white, border-bottom, padding 16px 20px):
- Back arrow left
- "Laporan Sales" bold 17px center
- Date "28 Agu 2026" slate-400 13px below

Scrollable content padding 20px, gap 12px:

Per SKU card (glass-card, rounded-2xl, padding 16px):
  Top row: variant name "CARBONARA" slate-900 bold 15px left
           price "Rp 2.000/pcs" slate-400 12px right JetBrains Mono
  Divider
  Row: label "Qty Terjual" slate-600 13px
       Stepper: [ − ] [ 63 ] [ + ] 
       Minus button slate-200 rounded-lg 36x36
       Number center bold 24px JetBrains Mono indigo-600
       Plus button indigo-100 rounded-lg 36x36 indigo-600 icon
  Row: label "Sampling" slate-400 12px
       Small input 60px width right-aligned, slate-200 bg rounded-lg

4 cards total: CARBONARA, BOLOGNESE, AGLIO OLIO, GORENG

Fixed bottom bar (white, border-top, padding 16px 20px):
- "Total Omzet" slate-500 12px + "Rp 378.000" bold 20px JetBrains Mono slate-900
- Button "Kirim Laporan" full-width indigo-600 height 52px rounded-xl white bold
Font: Plus Jakarta Sans + JetBrains Mono for numbers.
```

---

### 5. SPG Input Laporan Stok
```
Mobile 390x844px. Background #f8fafc.

Header same as Sales but title "Laporan Stok".

Per SKU card (glass-card, rounded-2xl, padding 16px):
  Variant name "CARBONARA" bold 15px
  Divider
  2-column input row:
    Left: label "Stok Awal" slate-500 11px, big number input 
          JetBrains Mono 22px center, slate-100 background rounded-xl
    Right: label "Stok Akhir" slate-500 11px, same input style
  Auto-calculated row (indigo-50 background, rounded-lg, padding 8px 12px):
    "Selisih" slate-500 12px left + "63 pcs" indigo-600 bold 14px right JetBrains Mono

If selisih ≠ qty_sold + sampling — warning banner below card:
  Amber-50 background, amber-600 border-left 3px, rounded-r-lg, padding 10px 12px
  "⚠ Ada 2 unit tidak terhitung. Jelaskan:" amber-700 12px
  Input "Qty lainnya" small + textarea "Alasan (rusak, retur, dll...)"

Fixed bottom: "Simpan Laporan" button same as Sales.
```

---

### 6. SPG Riwayat & Status Laporan
```
Mobile 390x844px. Background #f8fafc.

Header "Riwayat Laporan" bold. Filter tabs: "Sales" | "Stok" inline pill tabs.

List of report cards (glass-card, rounded-2xl, padding 14px 16px):
  Row 1: Date "28 Agu 2026" slate-400 12px left + status pill right:
    pending: amber-50 bg, amber-700 text, border amber "Menunggu"
    approved: emerald-50 bg, emerald-700 text, border emerald "Disetujui" 
    rejected: rose-50 bg, rose-700 text, border rose "Ditolak"
  Row 2: Outlet name slate-800 bold 14px
  Row 3: Total qty/omzet slate-500 12px JetBrains Mono
  If rejected: rose-50 banner "Catatan TL: [notes]" rose-600 12px inside card

Tapping rejected card → opens edit form same as input form.
```

---

### 7. SPG Profil
```
Mobile 390x844px. Background #f8fafc.

Top section: centered avatar circle (initials white on indigo-600, 64px),
Name bold 18px, NIP "NIP: 20140" slate-400 13px JetBrains Mono,
Outlet "KAIRO" indigo-600 13px.

Menu list (glass-card, rounded-2xl, divide-y divide-slate-100):
  Row: icon + "Outlet Saya" + chevron right slate-300
  Row: icon + "TL / Supervisor" + name value right slate-500
  Row: icon + "Riwayat Absensi" + chevron
  Row: icon + "Riwayat Laporan" + chevron

Bottom: Button "Keluar" full-width height 48px 
rose-50 background rose-600 text rose border rounded-xl.
Font: Plus Jakarta Sans.
```

---

## HALAMAN TL (TEAM LEADER)

---

### 8. TL Dashboard — Monitoring Absensi
```
Mobile 390x844px. Background #f8fafc.

Header (white, border-bottom):
- "Dashboard TL" bold 17px
- Subtitle "28 Agustus 2026 · 12 SPG binaan" slate-400 13px

Summary row 3 stat chips (inline, scroll-x if needed):
  - "8 Hadir" emerald-50 bg emerald-600 text rounded-full px-12 py-6
  - "2 Belum" slate-100 bg slate-500 text
  - "2 GPS ⚠" rose-50 bg rose-600 text

SPG list (gap 10px, padding 20px):
Per SPG card (glass-card rounded-xl padding 12px 16px):
  Left: avatar circle initials 40px indigo-200 bg indigo-700 text
  Center: Name bold 14px, outlet name slate-400 12px below
  Right: status pill (on_time=emerald, late=amber, 
         location_unverified=rose "GPS ⚠", not_checked_in=slate "Belum")
  If location_unverified: tap expands → shows selfie thumbnail + coordinates
  + button "Tandai Valid" emerald outline small + "Hubungi" slate outline small

Bottom nav: Home | Approval | Performa | Profil
```

---

### 9. TL Approval Queue
```
Mobile 390x844px. Background #f8fafc.

Header "Antrian Approval" bold. 
Badge on title: rose-500 circle "3" white text (pending count).

Filter tabs: "Semua" | "Sales" | "Stok" pill tabs indigo active.

Approval cards (glass-card rounded-2xl padding 16px gap 12px):
  Top row: type tag "SALES" indigo-100 indigo-700 rounded-full 11px bold left
           date "28 Agu" slate-400 12px right
  SPG name bold 15px, outlet name slate-500 13px
  Summary: "4 SKU · Total Rp 756.000" slate-600 13px JetBrains Mono
  If stock: "Selisih: 63 pcs · Other: 2 pcs (rusak)" slate-600 13px

  Tap to expand → shows full detail per SKU inline table
  
  Action row (inside card, border-top slate-100 pt-12):
    "Tolak" button: rose-50 bg rose-600 text border-rose rounded-lg flex-1 h-40
    "Setujui" button: emerald-600 bg white text rounded-lg flex-1 h-40
  If Tolak tapped: input field slides down "Catatan revisi..." 
    with "Kirim Penolakan" rose button

Empty state: illustration + "Semua laporan sudah diproses 🎉" slate-400.
```

---

### 10. TL Set Harga SKU per Outlet
```
Mobile 390x844px. Background #f8fafc.

Header "Harga SKU" bold + back arrow.
Outlet selector dropdown top: "Pilih Outlet..." slate border rounded-xl height 48px.

After outlet selected — list of SKU cards (glass-card rounded-2xl):
  Per SKU row (padding 14px 16px, border-bottom slate-100):
    Variant "CARBONARA" bold 14px left
    Right: if price set → "Rp 5.500" bold indigo-600 JetBrains Mono + edit icon
           if no override → "Rp 2.000 (default)" slate-400 italic + set icon
    Tap row → inline edit: input with currency prefix "Rp" 
    JetBrains Mono, save checkmark button emerald, cancel X slate

Bottom: "Simpan Semua" indigo-600 full-width button.
```

---

### 11. TL Rekap Performa SPG
```
Mobile 390x844px. Background #f8fafc.

Header "Performa SPG" bold.
Period filter tabs: "Hari Ini" | "Minggu Ini" | "Bulan Ini"

Per SPG card (glass-card rounded-2xl padding 16px):
  Top: name bold 14px + outlet name slate-400 12px
  Stats row 3 chips:
    "Omzet Rp 1.2jt" indigo-50 indigo-700 bold
    "28 Laporan" slate-100 slate-600
    "2 Ditolak" rose-50 rose-600
  Progress bar: target vs actual indigo filled / slate-100 track, 
  "62% dari target harian" slate-500 11px below

Sort by omzet descending by default.
```

---

## HALAMAN ADMIN

---

### 12. Admin Dashboard
```
Tablet/mobile 768x1024px. Background #f8fafc.

Sidebar left 240px (white, border-right #e2e8f0):
  Logo "WOW JSM" indigo-600 bold 16px + "Admin Panel" slate-400 11px top
  Nav items: Dashboard, Users, Outlets, Produk & Harga, Import Excel, Export Data
  Active item: indigo-50 bg, indigo-600 text, left border 3px indigo-600
  Inactive: slate-600 hover slate-900

Main content:
  Header "Dashboard" bold 20px + date right slate-400
  
  4 stat cards row (glass-card rounded-2xl padding 20px):
    "Total SPG Aktif" + number bold 32px + icon users indigo
    "Outlet Aktif" + number + icon store
    "Laporan Pending" + number rose-600 + icon clock rose
    "Laporan Hari Ini" + number + icon chart

  Table "SPG Terbaru" below: NIP | Nama | Outlet | TL | Status
  Status: active=emerald pill, inactive=slate pill
```

---

### 13. Admin Import Excel
```
Tablet 768x1024px. Background #f8fafc. Main content area (no sidebar shown for focus).

Header "Import & Sinkronisasi Data SPG" bold 20px
Subtitle "Upload file DATABASE M4 WOW GMM MT JSM.xlsx" slate-400 14px

Upload zone (dashed 2px border #cbd5e1, rounded-2xl, padding 40px, center):
  Upload icon slate-400 48px
  "Seret file Excel ke sini" slate-600 15px bold
  "atau" slate-400 12px
  Button "Pilih File" outline indigo rounded-xl px-20 py-10

After upload — parsing indicator (indigo spinner + "Membaca data...").

Preview section (glass-card rounded-2xl padding 24px):
  Title "Hasil Parsing" bold 16px

  3 stat badges row:
    "45 User Baru" emerald-50 emerald-700 rounded-xl padding 12px 20px bold
    "12 Diperbarui" indigo-50 indigo-700
    "3 Akan Nonaktif" rose-50 rose-700

  Section "SPG Akan Dinonaktifkan" (rose-50 bg rounded-xl padding 16px):
    Title "⚠ Konfirmasi Penonaktifan" rose-700 14px bold
    Table: checkbox | NIP | Nama | Toko | TL
    Each row has checkbox left
  
  Action buttons row:
    "Nonaktifkan Semua" rose-600 filled rounded-xl height 44px
    "Pilih Manual" outline rose rounded-xl height 44px
    "Skip" ghost slate rounded-xl height 44px

  "Simpan Perubahan" indigo-600 full-width height 52px rounded-xl bottom.
```

---

### 14. Admin Manajemen Users
```
Tablet 768x1024px. With sidebar.

Header row: "Manajemen Users" bold 20px left + "Tambah User" indigo button right.

Filter bar: search input + dropdown "Semua Role" + dropdown "Status"

Table (glass-card, rounded-2xl, sticky header):
  Columns: NIP | Nama | No. HP | Role | Outlet | TL | Status | Aksi
  Role pill: spg=indigo, tl=violet, admin=slate
  Status pill: active=emerald, inactive=slate
  Aksi: edit icon indigo + deactivate icon rose (icon-only buttons)

Add/Edit User slide-over panel right (400px, white, shadow-2xl):
  Title "Tambah User" bold 18px + X close
  Form fields: Nama, NIP, No. HP, Role (select), Outlet (select), TL (select)
  Button "Simpan" indigo full-width bottom
```

---

### 15. Admin Manajemen Produk & Harga
```
Tablet 768x1024px. With sidebar.

Header "Produk & Harga" bold + "Tambah Produk" button right.

Product cards (2-col grid, glass-card rounded-2xl padding 20px):
  Product name "WOW Spaghetti" bold 15px
  Variant badge "CARBONARA" indigo-100 indigo-700 rounded-full
  Default price "Rp 2.000" bold 20px JetBrains Mono indigo-600
  Status toggle: active=emerald / inactive=slate
  "Lihat Override Harga" link indigo 12px below → 
    expands table of outlet overrides

Add product panel same slide-over style.
```

---

### 16. Admin Export Data
```
Tablet 768x1024px. With sidebar.

Header "Export Data" bold.

Form card (glass-card rounded-2xl padding 28px):
  "Pilih Rentang Tanggal" label
  Date range picker: [Dari] — [Sampai] inline, slate-border rounded-xl

  "Filter Outlet" — multi-select checkbox list or "Semua Outlet" toggle
  
  "Format Export" radio: Excel (.xlsx) | CSV
  
  Preview summary (indigo-50 bg rounded-xl padding 16px):
    "Estimasi: 1.240 baris data · 45 outlet · 28 hari" indigo-700 14px

  Button "Generate & Download" indigo-600 full-width height 52px rounded-xl
  Progress bar appears during generation indigo animated.
```

---

## KOMPONEN REUSABLE

```
Status Pills:
  pending/menunggu : amber-50 bg, amber-700 text, 1px border amber-300
  approved/disetujui : emerald-50 bg, emerald-700 text, 1px border emerald-300
  rejected/ditolak : rose-50 bg, rose-700 text, 1px border rose-300
  on_time : emerald filled white text
  late : amber filled white text
  location_unverified : rose filled white text

Toast notification: bottom center, white bg, border-l 4px colored, 
shadow-lg rounded-xl, slide up animation 300ms.

Bottom nav (SPG & TL): white bg, border-top #e2e8f0, 
4 icons 24px, label 10px below, active=indigo-600, inactive=slate-400.

Loading skeleton: shimmer gradient #e2e8f0 → #f1f5f9 → #e2e8f0 
1.5s infinite animation on card placeholder.
```
