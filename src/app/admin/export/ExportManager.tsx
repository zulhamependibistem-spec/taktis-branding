"use client";

import { useState } from "react";
import { getExportData } from "@/lib/actions/admin";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type SaleRow = {
  report_date: string;
  qty_sold: number;
  sampling_qty: number;
  unit_price: number;
  total_selling: number;
  user: { full_name: string; supervisor?: { full_name: string } | null } | null;
  product: { name: string; variant: string } | null;
  outlet: { name: string; code_outlet: string; code_subdist?: string | null; channel_group?: string | null; grsm: string; area: string } | null;
};

type StockRow = {
  report_date: string;
  stock_awal: number;
  stock_akhir: number;
  selisih: number;
  other_qty: number;
  other_reason: string | null;
  user: { full_name: string; supervisor?: { full_name: string } | null } | null;
  product: { name: string; variant: string } | null;
  outlet: { name: string; code_outlet: string; code_subdist?: string | null; channel_group?: string | null; grsm: string; area: string } | null;
};

type AttRow = {
  report_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_photo_url: string | null;
  check_out_photo_url: string | null;
  status: string;
  check_in_lat: number | null;
  check_in_lng: number | null;
  user: { full_name: string; nip: string | null; supervisor?: { full_name: string } | null } | null;
  outlet: { name: string; code_outlet: string; code_subdist?: string | null; channel_group?: string | null; grsm: string; area: string } | null;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function getWeekNum(dStr: string): number {
  const d = new Date(dStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthName(dStr: string): string {
  const d = new Date(dStr);
  return MONTHS[d.getMonth()] ?? "";
}

function formatDateDMY(dStr: string): string {
  if (!dStr) return "";
  const d = new Date(dStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatTimeWIB(isoStr: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });
  } catch {
    return "";
  }
}

const inputCls =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-mono outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function ExportManager() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busyType, setBusyType] = useState<"sales_stock" | "attendance" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function generateSalesAndStock() {
    setMsg(null);
    if (!from || !to) {
      setMsg({ ok: false, text: "Isi tanggal awal & akhir." });
      return;
    }
    setBusyType("sales_stock");
    const res = await getExportData({ from, to });
    setBusyType(null);
    if (!res.success) {
      setMsg({ ok: false, text: res.error });
      return;
    }

    const sales = (res.sales as unknown as SaleRow[]).map((r) => ({
      WEEK: getWeekNum(r.report_date),
      BULAN: getMonthName(r.report_date),
      TANGGAL: formatDateDMY(r.report_date),
      GRSM: r.outlet?.grsm ?? "",
      "NAMA TEAM LEADER": r.user?.supervisor?.full_name ?? "",
      "CHANNEL GROUP": r.outlet?.channel_group ?? "",
      "Kode Subdist": r.outlet?.code_subdist ?? "",
      "Kode Outlet": r.outlet?.code_outlet ?? "",
      "NAMA TOKO": r.outlet?.name ?? "",
      "NAMA SPG": r.user?.full_name ?? "",
      VARIANT: r.product?.variant ?? "",
      "HARGA JUAL (PCS)": r.unit_price,
      "QTY SELLING (PCS)": r.qty_sold,
      "TOTAL SELLING (RP)": r.total_selling,
      "SAMPLING YANG KELUAR (CUP)": r.sampling_qty,
    }));

    const stock = (res.stock as unknown as StockRow[]).map((r) => ({
      WEEK: getWeekNum(r.report_date),
      BULAN: getMonthName(r.report_date),
      TANGGAL: formatDateDMY(r.report_date),
      GRSM: r.outlet?.grsm ?? "",
      AREA: r.outlet?.area ?? "",
      "NAMA TEAM LEADER": r.user?.supervisor?.full_name ?? "",
      "CHANNEL GROUP": r.outlet?.channel_group ?? "",
      "Kode Subdist": r.outlet?.code_subdist ?? "",
      "Kode Outlet": r.outlet?.code_outlet ?? "",
      "NAMA TOKO": r.outlet?.name ?? "",
      "NAMA SPG": r.user?.full_name ?? "",
      VARIANT: r.product?.variant ?? "",
      "STOK AWAL (IN PCS)": r.stock_awal,
      "STOK AKHIR (IN PCS)": r.stock_akhir,
      "SELISIH (PCS)": r.selisih,
      "QTY LAIN (PCS)": r.other_qty ?? 0,
      "ALASAN (LAIN)": r.other_reason ?? "",
    }));

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const wsSales = XLSX.utils.json_to_sheet(sales);
    wsSales["!cols"] = [
      { wch: 8 },  // WEEK
      { wch: 8 },  // BULAN
      { wch: 12 }, // TANGGAL
      { wch: 10 }, // GRSM
      { wch: 24 }, // NAMA TEAM LEADER
      { wch: 16 }, // CHANNEL GROUP
      { wch: 14 }, // Kode Subdist
      { wch: 14 }, // Kode Outlet
      { wch: 30 }, // NAMA TOKO
      { wch: 26 }, // NAMA SPG
      { wch: 16 }, // VARIANT
      { wch: 18 }, // HARGA JUAL
      { wch: 18 }, // QTY SELLING
      { wch: 20 }, // TOTAL SELLING
      { wch: 28 }, // SAMPLING
    ];
    XLSX.utils.book_append_sheet(wb, wsSales, "DAILY REPORT");

    const wsStock = XLSX.utils.json_to_sheet(stock);
    wsStock["!cols"] = [
      { wch: 8 },  // WEEK
      { wch: 8 },  // BULAN
      { wch: 12 }, // TANGGAL
      { wch: 10 }, // GRSM
      { wch: 16 }, // AREA
      { wch: 24 }, // NAMA TEAM LEADER
      { wch: 16 }, // CHANNEL GROUP
      { wch: 14 }, // Kode Subdist
      { wch: 14 }, // Kode Outlet
      { wch: 30 }, // NAMA TOKO
      { wch: 26 }, // NAMA SPG
      { wch: 16 }, // VARIANT
      { wch: 18 }, // STOK AWAL
      { wch: 18 }, // STOK AKHIR
      { wch: 14 }, // SELISIH
      { wch: 14 }, // QTY LAIN
      { wch: 30 }, // ALASAN
    ];
    XLSX.utils.book_append_sheet(wb, wsStock, "MONITORING STOK");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REPORT_TAKTIS_TSJ_${from}_sd_${to}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    setMsg({ ok: true, text: `Berhasil export Sales & Stok. DAILY REPORT (${sales.length} baris), MONITORING STOK (${stock.length} baris).` });
  }

  async function generateAttendance() {
    setMsg(null);
    if (!from || !to) {
      setMsg({ ok: false, text: "Isi tanggal awal & akhir." });
      return;
    }
    setBusyType("attendance");
    const res = await getExportData({ from, to });
    setBusyType(null);
    if (!res.success) {
      setMsg({ ok: false, text: res.error });
      return;
    }

    const attList = ((res.attendance ?? []) as unknown as AttRow[]).map((r) => ({
      WEEK: getWeekNum(r.report_date),
      BULAN: getMonthName(r.report_date),
      TANGGAL: formatDateDMY(r.report_date),
      GRSM: r.outlet?.grsm ?? "",
      AREA: r.outlet?.area ?? "",
      "NAMA TEAM LEADER": r.user?.supervisor?.full_name ?? "",
      "NAMA SPG": r.user?.full_name ?? "",
      NIP: r.user?.nip ?? "",
      "Kode Subdist": r.outlet?.code_subdist ?? "",
      "Kode Outlet": r.outlet?.code_outlet ?? "",
      "NAMA TOKO": r.outlet?.name ?? "",
      "STATUS ABSEN": r.status === "checked_out" ? "Check Out" : r.status === "checked_in" ? "Check In" : r.status,
      "JAM CHECK IN": formatTimeWIB(r.check_in_time),
      "JAM CHECK OUT": formatTimeWIB(r.check_out_time),
      LATITUDE: r.check_in_lat ?? "",
      LONGITUDE: r.check_in_lng ?? "",
      "URL FOTO CHECK IN": r.check_in_photo_url ? `=HYPERLINK("${r.check_in_photo_url}", "Lihat Foto Check-In")` : "",
      "URL FOTO CHECK OUT": r.check_out_photo_url ? `=HYPERLINK("${r.check_out_photo_url}", "Lihat Foto Check-Out")` : "",
    }));

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsAtt = XLSX.utils.json_to_sheet(attList);
    wsAtt["!cols"] = [
      { wch: 8 },  // WEEK
      { wch: 8 },  // BULAN
      { wch: 12 }, // TANGGAL
      { wch: 10 }, // GRSM
      { wch: 16 }, // AREA
      { wch: 24 }, // NAMA TEAM LEADER
      { wch: 26 }, // NAMA SPG
      { wch: 16 }, // NIP
      { wch: 14 }, // Kode Subdist
      { wch: 14 }, // Kode Outlet
      { wch: 30 }, // NAMA TOKO
      { wch: 16 }, // STATUS ABSEN
      { wch: 14 }, // JAM CHECK IN
      { wch: 14 }, // JAM CHECK OUT
      { wch: 14 }, // LATITUDE
      { wch: 14 }, // LONGITUDE
      { wch: 50 }, // URL FOTO CHECK IN
      { wch: 50 }, // URL FOTO CHECK OUT
    ];
    XLSX.utils.book_append_sheet(wb, wsAtt, "DATA ABSENSI");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REPORT_ATTENDANCE_${from}_sd_${to}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    setMsg({ ok: true, text: `Berhasil export Absensi. DATA ABSENSI (${attList.length} baris).` });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Date Range Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-[16px] font-bold text-slate-900">Pilih Rentang Tanggal Export</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-500">Tanggal Awal</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-500">Tanggal Akhir</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Option 1: Sales & Stock */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Laporan Sales &amp; Stok</h3>
            <p className="mt-1 text-[12px] text-slate-400">
              Rekap penjualan harian &amp; pemantauan sisa stok SPG.
            </p>
          </div>
          <button
            onClick={generateSalesAndStock}
            disabled={busyType !== null}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Icon name="download" size={18} />
            {busyType === "sales_stock" ? "Memproses..." : "Download Sales & Stok (.xlsx)"}
          </button>
        </div>
      </div>

      {/* Option 2: Attendance */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Laporan Data Absensi</h3>
            <p className="mt-1 text-[12px] text-slate-400">
              Rekap waktu Check-in/out, lokasi GPS, &amp; foto selfie SPG.
            </p>
          </div>
          <button
            onClick={generateAttendance}
            disabled={busyType !== null}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Icon name="download" size={18} />
            {busyType === "attendance" ? "Memproses..." : "Download Absensi (.xlsx)"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium",
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          <Icon name={msg.ok ? "check" : "warning"} size={16} />
          {msg.text}
        </div>
      )}
    </div>
  );
}