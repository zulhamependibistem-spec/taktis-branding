"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  getAttendanceImportPreview,
  applyAttendanceImport,
  type AttendancePreviewRow,
} from "@/lib/actions/admin";

type AttState = {
  fileName: string;
  rows: AttendancePreviewRow[] | null;
  inRange: number;
  outside: number;
};

const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const dateCls = `${inputCls} max-w-[160px]`;

function normKey(s: string) {
  return s.toUpperCase().trim().replace(/\s+/g, " ");
}

function pickCell(r: Record<string, unknown>, aliases: string[]): string {
  const entries = Object.entries(r).map(([k, v]) => [normKey(k), v] as const);
  for (const a of aliases) {
    const hit = entries.find(([k]) => k === a);
    if (hit && hit[1] !== undefined && hit[1] !== null && String(hit[1]).trim() !== "") {
      return String(hit[1]).trim();
    }
  }
  return "";
}

function parseTanggal(v: string): string {
  const s = v.trim().replace(/"/g, "");
  if (!s) return "";
  if (/^\d+$/.test(s)) {
    // Excel serial
    const ms = Math.round((Number(s) - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  let parts: string[] = [];
  if (s.includes("-")) parts = s.split("-");
  else if (s.includes("/")) parts = s.split("/");
  else if (s.includes(".")) parts = s.split(".");
  if (parts.length !== 3) return "";
  let y = parts[0];
  const m = parts[1];
  let d = parts[2];
  if (y.length === 4) {
    // yyyy-mm-dd
  } else if (d.length === 4) {
    // dd-mm-yyyy
    const t = y;
    y = d;
    d = t;
  } else {
    // dd-mm-yy -> assume dd/mm/yyyy
    const t = y;
    y = d.length === 2 ? `20${d}` : d;
    d = t;
  }
  const yN = Number(y);
  const mN = Number(m);
  const dN = Number(d);
  if (!yN || !mN || !dN || mN < 1 || mN > 12 || dN < 1 || dN > 31) return "";
  return `${yN}-${String(mN).padStart(2, "0")}-${String(dN).padStart(2, "0")}`;
}

function parseJam(v: string): string {
  const s = v.trim().replace(/"/g, "");
  if (!s) return "";
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) < 1.0001) {
    // Excel time serial (fraction of day)
    const totalMin = Math.round(Number(s) * 1440);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const m = s.match(/(\d{1,2})[.:](\d{1,2})/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function AttendanceImport() {
  const [a, setA] = useState<AttState>({ fileName: "", rows: null, inRange: 0, outside: 0 });
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyApply, setBusyApply] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<"all" | "baru" | "ada" | "nf">("all");

  function clearState() {
    setA({ fileName: "", rows: null, inRange: 0, outside: 0 });
    setResult(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setResult(null);
    setBusy(true);

    if (!dari || !sampai) {
      setBusy(false);
      setResult({ ok: false, msg: "Pilih rentang tanggal (dari & sampai) terlebih dahulu." });
      return;
    }
    if (dari > sampai) {
      setBusy(false);
      setResult({ ok: false, msg: "Tanggal 'Dari' tidak boleh lebih besar dari 'Sampai'." });
      return;
    }

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const raw: { nip: string; tanggal: string; jamMasuk: string; jamKeluar: string; lokasi: string }[] = [];
      for (const sn of wb.SheetNames) {
        const snKey = sn.toUpperCase();
        if (snKey.includes("NON AKTIF")) continue;
        const sheet = wb.Sheets[sn];
        if (!sheet || !sheet["!ref"]) continue;
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        for (const r of json) {
          const nip = pickCell(r, ["NIP", "NO. NIP", "NO NIP", "NIK"]);
          const tanggal = parseTanggal(pickCell(r, ["TANGGAL", "DATE", "TGL", "HARI/TANGGAL"]));
          const jamMasuk = parseJam(
            pickCell(r, ["JAM MASUK", "JAM IN", "CHECK IN", "CHECK-IN", "MASUK", "ABSEN MASUK"])
          );
          const jamKeluar = parseJam(
            pickCell(r, ["JAM KELUAR", "JAM OUT", "CHECK OUT", "CHECK-OUT", "KELUAR", "ABSEN PULANG"])
          );
          const lokasi = pickCell(r, ["LOKASI", "TEMPAT", "ALAMAT", "AREA"]);
          if (!nip || !tanggal) continue;
          raw.push({ nip, tanggal, jamMasuk, jamKeluar, lokasi });
        }
      }

      if (raw.length === 0) {
        setBusy(false);
        setResult({
          ok: false,
          msg: "Tidak ada baris valid. Pastikan file punya kolom NIP & TANGGAL (dan opsional JAM MASUK / JAM KELUAR).",
        });
        return;
      }

      const res = await getAttendanceImportPreview(raw, dari, sampai);
      if (!res.success) {
        setBusy(false);
        setResult({ ok: false, msg: res.error });
        return;
      }
      setA({ fileName: f.name, rows: res.preview, inRange: res.inRange, outside: res.outside });
    } catch {
      clearState();
      setResult({ ok: false, msg: "Gagal membaca file. Pastikan format Excel valid." });
    } finally {
      setBusy(false);
    }
  }

  async function doApply() {
    if (!a.rows) return;
    const valid = a.rows.filter((r) => r.mode !== "tidak_ditemukan");
    if (valid.length === 0) {
      setResult({ ok: false, msg: "Tidak ada baris yang bisa diimport." });
      return;
    }
    setBusyApply(true);
    setResult(null);
    const res = await applyAttendanceImport(
      valid.map((r) => ({
        nip: r.nip,
        tanggal: r.tanggal,
        jamMasuk: r.jamMasuk,
        jamKeluar: r.jamKeluar,
        lokasi: r.lokasi,
      }))
    );
    setBusyApply(false);
    if (res.success) {
      setResult({
        ok: true,
        msg: `Selesai! ${res.inserted} baris absensi ditambahkan, ${res.skipped} sudah ada (dilewati), ${res.failed} gagal.`,
      });
      setA({ fileName: "", rows: null, inRange: 0, outside: 0 });
    } else {
      setResult({ ok: false, msg: res.error });
    }
  }

  const nBaru = useMemo(() => a.rows?.filter((r) => r.mode === "baru").length ?? 0, [a.rows]);
  const nAda = useMemo(() => a.rows?.filter((r) => r.mode === "ada").length ?? 0, [a.rows]);
  const nNf = useMemo(() => a.rows?.filter((r) => r.mode === "tidak_ditemukan").length ?? 0, [a.rows]);

  const filteredRows = useMemo(() => {
    if (!a.rows) return [];
    if (previewTab === "baru") return a.rows.filter((r) => r.mode === "baru");
    if (previewTab === "ada") return a.rows.filter((r) => r.mode === "ada");
    if (previewTab === "nf") return a.rows.filter((r) => r.mode === "tidak_ditemukan");
    return a.rows;
  }, [a.rows, previewTab]);

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Import Absensi ===== */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900">Import Absensi</h2>
          <p className="mt-1 text-[12px] text-slate-400">
            Upload file Excel (kolom: <span className="font-mono">NIP</span>,{" "}
            <span className="font-mono">TANGGAL</span>,{" "}
            <span className="font-mono">JAM MASUK</span>,{" "}
            <span className="font-mono">JAM KELUAR</span>). Hanya baris dalam rentang tanggal yang diimport.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Dari Tanggal</span>
            <input
              type="date"
              value={dari}
              onChange={(e) => {
                setDari(e.target.value);
                setResult(null);
              }}
              className={dateCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sampai Tanggal</span>
            <input
              type="date"
              value={sampai}
              onChange={(e) => {
                setSampai(e.target.value);
                setResult(null);
              }}
              className={dateCls}
            />
          </label>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={handleFile}
              aria-label="Pilih file Excel absensi"
            />
            <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[14px] font-semibold text-white transition hover:bg-slate-800">
              <Icon name="upload" size={18} />
              {busy ? "Membaca..." : "Pilih File Excel Absensi"}
            </span>
          </label>
          {a.fileName && <span className="truncate font-mono text-[12px] text-emerald-600">{a.fileName}</span>}
        </div>

        {result && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium",
              result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            <Icon name={result.ok ? "check" : "warning"} size={16} />
            {result.msg}
          </div>
        )}

        {a.rows && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <h3 className="text-[15px] font-semibold text-slate-900">Preview Import Absensi</h3>
                <p className="text-[12px] text-slate-400">
                  Rentang dipilih: <span className="font-mono">{dari}</span> →{" "}
                  <span className="font-mono">{sampai}</span> · {a.inRange} di dalam, {a.outside} di luar
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPreviewTab("all")}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition",
                    previewTab === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Semua ({a.rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("baru")}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition",
                    previewTab === "baru"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  )}
                >
                  Baru ({nBaru})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("ada")}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition",
                    previewTab === "ada"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  )}
                >
                  Sudah Ada ({nAda})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("nf")}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition",
                    previewTab === "nf"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  )}
                >
                  NIP Tidak Ditemukan ({nNf})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">NIP</th>
                      <th className="px-4 py-2.5 font-semibold">Nama</th>
                      <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                      <th className="px-4 py-2.5 font-semibold">Jam Masuk</th>
                      <th className="px-4 py-2.5 font-semibold">Jam Keluar</th>
                      <th className="px-4 py-2.5 font-semibold">Lokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-slate-400">
                          Tidak ada baris dalam kategori ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.slice(0, 60).map((r, i) => (
                        <tr key={`${r.nip}-${r.tanggal}-${i}`} className="transition hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-bold",
                                r.mode === "baru"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : r.mode === "ada"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-600"
                              )}
                            >
                              {r.mode === "baru" ? "BARU" : r.mode === "ada" ? "SUDAH ADA" : "TIDAK DITEMUKAN"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.nip || "-"}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{r.nama || "-"}</td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.tanggal}</td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.jamMasuk || "-"}</td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.jamKeluar || "-"}</td>
                          <td className="px-4 py-2.5 text-slate-500">{r.lokasi || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > 60 && (
                <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">
                  +{filteredRows.length - 60} baris lainnya (total {filteredRows.length}).
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
                <button
                  onClick={clearState}
                  className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={doApply}
                  disabled={busyApply || nNf === a.rows.length}
                  className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[14px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Icon name="check" size={18} />
                  {busyApply ? "Menyimpan..." : `Import ${a.rows.length - nNf} Baris Absensi`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}