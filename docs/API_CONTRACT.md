# API Contract
## Aplikasi Absensi & Reporting SPG-MPP — WOW JSM

**Tanggal:** 28 Agustus 2026  
**Stack:** Next.js 14 Server Actions + Supabase (PostgreSQL + RLS)

> Semua fungsi di bawah adalah **Server Actions** (`"use server"`) yang dipanggil langsung dari komponen React.  
> Akses kontrol ditegakkan di dua lapis: **middleware Next.js** (cek JWT role) + **Supabase RLS** (cek user_id di DB).

---

## Konvensi Response

```ts
// Sukses
{ success: true, data: <payload> }

// Gagal
{ success: false, error: "Pesan error yang human-readable" }
```

---

## 1. AUTH

---

### `login(phone, nip)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Login — semua role |
| **Akses** | Public |
| **Input** | `phone: string`, `nip: string` |
| **Proses** | Query tabel `users` WHERE `phone = $1 AND nip = $2 AND status = 'active'`. Jika cocok → buat JWT session dengan payload `{ id, role, full_name, assigned_outlet_id }` |
| **Output sukses** | `{ user: { id, role, full_name }, token: string }` |
| **Output gagal** | `{ error: "Nomor HP atau NIP tidak valid" }` |
| **Catatan** | NIP tidak di-hash di v1 (plain text). Upgrade ke bcrypt saat traffic tinggi. |

---

### `logout()`
| | |
|---|---|
| **Dipanggil dari** | Halaman Profil — semua role |
| **Akses** | Authenticated |
| **Proses** | Hapus session cookie |
| **Output** | Redirect ke `/login` |

---

## 2. ABSENSI (SPG)

---

### `getAttendanceToday()`
| | |
|---|---|
| **Dipanggil dari** | SPG Home |
| **Akses** | SPG |
| **Proses** | Query `attendance` WHERE `user_id = me AND outlet_id = my_outlet AND report_date = today` |
| **Output sukses** | `{ attendance: { id, check_in_time, check_out_time, status } \| null }` |

---

### `checkIn(payload)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Check-In SPG |
| **Akses** | SPG |
| **Input** | `{ photo_base64: string, lat: number, lng: number, bypass_reason?: string }` |
| **Validasi** | 1. Cek belum ada baris attendance hari ini untuk user+outlet → jika ada, return error "Sudah check-in hari ini". 2. Hitung jarak GPS ke koordinat outlet → jika > 200m dan tidak ada `bypass_reason`, return error "GPS di luar area outlet". |
| **Proses** | 1. Kompres foto sudah dilakukan di client sebelum dikirim. 2. Upload foto ke Supabase Storage bucket `attendance-photos`. 3. Tentukan status: `on_time` / `late` / `location_unverified` (jika ada bypass_reason). 4. Insert baris baru ke `attendance` dengan `check_in_time = now()`. 5. Jika `location_unverified` → flag untuk review TL. |
| **Output sukses** | `{ attendance: { id, check_in_time, status } }` |
| **Output gagal** | `{ error: "Sudah check-in hari ini" \| "GPS di luar area outlet" }` |

---

### `checkOut(payload)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Check-Out SPG |
| **Akses** | SPG |
| **Input** | `{ photo_base64: string }` |
| **Validasi** | 1. Cek ada baris attendance hari ini dengan `check_in_time IS NOT NULL`. 2. Cek `check_out_time IS NULL` — jika sudah ada, return error. |
| **Proses** | Upload foto → UPDATE `attendance` SET `check_out_time = now(), check_out_photo_url = <url>` |
| **Output sukses** | `{ attendance: { check_out_time } }` |
| **Output gagal** | `{ error: "Belum check-in" \| "Sudah check-out hari ini" }` |

---

## 3. LAPORAN SALES (SPG)

---

### `getSalesFormData()`
| | |
|---|---|
| **Dipanggil dari** | Form Input Sales SPG |
| **Akses** | SPG |
| **Proses** | Query `products` WHERE `is_active = true`. Untuk setiap produk, cek `outlet_product_prices` untuk `outlet_id` SPG → ambil harga override jika ada, fallback ke `default_price`. |
| **Output** | `{ products: [{ id, name, variant, unit_price }] }` |

---

### `submitSalesReport(payload)`
| | |
|---|---|
| **Dipanggil dari** | Form Input Sales SPG |
| **Akses** | SPG |
| **Input** | `{ report_date: date, items: [{ product_id, qty_sold, sampling_qty? }] }` |
| **Validasi** | 1. Cek SPG sudah check-in hari ini (`check_in_time IS NOT NULL`). 2. Cek belum ada laporan sales untuk kombinasi `user_id + outlet_id + report_date` yang berstatus `pending` atau `approved`. |
| **Proses** | Untuk setiap item: ambil `unit_price` dari `outlet_product_prices` atau `default_price`. Hitung `total_selling = qty_sold × unit_price`. Insert ke `daily_sales_reports` dengan `status = 'pending'`. |
| **Output sukses** | `{ reports: [{ id, product_id, status }] }` |
| **Output gagal** | `{ error: "Belum check-in hari ini" \| "Laporan sudah disubmit" }` |

---

### `resubmitSalesReport(report_id, payload)`
| | |
|---|---|
| **Dipanggil dari** | Form Edit Laporan (setelah ditolak TL) |
| **Akses** | SPG (hanya milik sendiri) |
| **Input** | `{ qty_sold: number, sampling_qty?: number }` |
| **Validasi** | Status laporan harus `rejected`. |
| **Proses** | UPDATE `daily_sales_reports` SET `qty_sold, sampling_qty, total_selling, status = 'pending', notes = null`. |
| **Output sukses** | `{ report: { id, status: 'pending' } }` |

---

### `getSalesHistory()`
| | |
|---|---|
| **Dipanggil dari** | Halaman Riwayat SPG |
| **Akses** | SPG |
| **Proses** | Query `daily_sales_reports` WHERE `user_id = me` ORDER BY `report_date DESC`. |
| **Output** | `{ reports: [{ id, report_date, outlet, product, qty_sold, total_selling, status, notes }] }` |

---

## 4. LAPORAN STOK (SPG)

---

### `submitStockReport(payload)`
| | |
|---|---|
| **Dipanggil dari** | Form Input Stok SPG |
| **Akses** | SPG |
| **Input** | `{ report_date: date, items: [{ product_id, stock_awal, stock_akhir, other_qty?, other_reason? }] }` |
| **Validasi** | 1. Cek SPG sudah check-in. 2. Cek belum ada laporan stok `pending`/`approved` hari ini. 3. Jika `other_qty > 0` dan `other_reason` kosong → return error. |
| **Proses** | Hitung `selisih = stock_awal - stock_akhir` di server. Insert ke `daily_stock_reports` dengan `status = 'pending'`. |
| **Output sukses** | `{ reports: [{ id, product_id, selisih, status }] }` |
| **Output gagal** | `{ error: "other_reason wajib diisi jika other_qty > 0" }` |

---

### `resubmitStockReport(report_id, payload)`
| | |
|---|---|
| **Akses** | SPG (hanya milik sendiri, status harus `rejected`) |
| **Input** | `{ stock_awal, stock_akhir, other_qty?, other_reason? }` |
| **Proses** | Hitung ulang `selisih`. UPDATE status kembali ke `pending`. |

---

## 5. APPROVAL (TL)

---

### `getPendingApprovals()`
| | |
|---|---|
| **Dipanggil dari** | Halaman Approval TL |
| **Akses** | TL |
| **Proses** | Query `daily_sales_reports` + `daily_stock_reports` WHERE `status = 'pending'` AND SPG `supervisor_id = me`. Join dengan `users`, `outlets`, `products`. |
| **Output** | `{ sales: [...], stock: [...] }` |

---

### `approveReport(type, report_id)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Approval TL |
| **Akses** | TL (hanya SPG binaannya) |
| **Input** | `type: 'sales' \| 'stock'`, `report_id: uuid` |
| **Validasi** | Pastikan SPG pemilik laporan adalah binaan TL yang login (`supervisor_id = me`). |
| **Proses** | UPDATE status = `'approved'`, `approved_by = me`, `approved_at = now()`. |
| **Output sukses** | `{ report: { id, status: 'approved' } }` |

---

### `rejectReport(type, report_id, notes)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Approval TL |
| **Akses** | TL (hanya SPG binaannya) |
| **Input** | `type: 'sales' \| 'stock'`, `report_id: uuid`, `notes: string` |
| **Validasi** | `notes` tidak boleh kosong. |
| **Proses** | UPDATE status = `'rejected'`, `notes = <catatan TL>`. |
| **Output sukses** | `{ report: { id, status: 'rejected' } }` |

---

## 6. MONITORING ABSENSI (TL)

---

### `getTeamAttendanceToday()`
| | |
|---|---|
| **Dipanggil dari** | Dashboard TL |
| **Akses** | TL |
| **Proses** | Query semua `users` WHERE `supervisor_id = me AND status = 'active'`. LEFT JOIN `attendance` WHERE `report_date = today`. |
| **Output** | `{ spg_list: [{ id, name, outlet, attendance_status, check_in_time, check_out_time, location_bypass_reason }] }` |

---

### `verifyLocation(attendance_id)`
| | |
|---|---|
| **Dipanggil dari** | Dashboard TL — flag GPS |
| **Akses** | TL |
| **Proses** | UPDATE `attendance` SET `status = 'on_time'` atau `'late'` (recalculate dari check_in_time) WHERE `id = attendance_id`. |
| **Output sukses** | `{ attendance: { id, status } }` |

---

## 7. HARGA SKU PER OUTLET (TL / Admin)

---

### `getOutletPrices(outlet_id)`
| | |
|---|---|
| **Akses** | TL (outlet binaannya) / Admin (semua) |
| **Output** | `{ prices: [{ product_id, variant, default_price, override_price \| null, set_by }] }` |

---

### `setOutletPrice(outlet_id, product_id, price)`
| | |
|---|---|
| **Akses** | TL (outlet binaannya) / Admin |
| **Proses** | UPSERT `outlet_product_prices` ON CONFLICT `(outlet_id, product_id)` DO UPDATE SET `price = $price, set_by = me, created_at = now()`. |
| **Output sukses** | `{ price: { outlet_id, product_id, price } }` |

---

## 8. IMPORT EXCEL (Admin)

---

### `parseExcelImport(file)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Import Admin |
| **Akses** | Admin |
| **Input** | `file: File (.xlsx)` |
| **Proses** | Parse semua sheet (`AKTIF`, `NON AKTIF`, `BACK UP`). Rekonsiliasi dengan DB berdasarkan NIP. Klasifikasikan setiap baris: `new` / `update` / `deactivate`. |
| **Output** | `{ new_users: [...], updated_users: [...], deactivate_candidates: [{ nip, name, outlet, supervisor }] }` |
| **Catatan** | Fungsi ini hanya parsing — belum menyimpan ke DB. |

---

### `confirmImport(payload)`
| | |
|---|---|
| **Dipanggil dari** | Preview Screen Import Admin |
| **Akses** | Admin |
| **Input** | `{ confirm_new: true, confirm_update: true, deactivate_ids: uuid[] }` |
| **Proses** | Batch INSERT user baru. Batch UPDATE user existing. SET `status = 'inactive'` untuk `deactivate_ids`. |
| **Output sukses** | `{ inserted: number, updated: number, deactivated: number }` |

---

## 9. MANAJEMEN USER (Admin)

---

### `createUser(payload)`
| | |
|---|---|
| **Akses** | Admin / TL (untuk role `spg` saja) |
| **Input** | `{ full_name, nip, phone, role, assigned_outlet_id, supervisor_id? }` |
| **Validasi** | NIP dan phone harus unik. TL hanya bisa buat role `spg`. |
| **Output sukses** | `{ user: { id, nip, role } }` |

---

### `updateUser(user_id, payload)`
| | |
|---|---|
| **Akses** | Admin |
| **Input** | Field yang diubah (partial update) |
| **Output sukses** | `{ user: { id } }` |

---

### `deactivateUser(user_id)`
| | |
|---|---|
| **Akses** | Admin |
| **Proses** | SET `status = 'inactive'`. Data historis tetap tersimpan. |
| **Output sukses** | `{ user: { id, status: 'inactive' } }` |

---

## 10. EXPORT DATA (Admin)

---

### `exportData(payload)`
| | |
|---|---|
| **Dipanggil dari** | Halaman Export Admin |
| **Akses** | Admin |
| **Input** | `{ date_from: date, date_to: date, outlet_ids?: uuid[], format: 'xlsx' \| 'csv' }` |
| **Proses** | Query `daily_sales_reports` + `daily_stock_reports` JOIN dengan `users`, `outlets`, `products` sesuai filter. Generate file via ExcelJS (xlsx) atau Papa Parse (csv). |
| **Output** | File download stream |
| **Catatan** | Format kolom output mengikuti struktur `DAILY REPORT` di file Excel existing BJM agar kompatibel langsung. |
