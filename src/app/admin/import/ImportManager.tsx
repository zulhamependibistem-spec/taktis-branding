"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  getOutletCodes,
  syncOutlets,
  getUserImportPreview,
  applyUserImport,
  type OutletImportRow,
  type UserImportRow,
} from "@/lib/actions/admin";

type PreviewRow = OutletImportRow & { mode: "baru" | "update" };

type UserPreviewRow = UserImportRow & {
  role: "tl" | "spg";
  mode: "baru" | "update";
  changes?: string[];
  hasChanges?: boolean;
  outletId: string | null;
  outletMatch: "exact" | "norm" | "contains" | "none";
};

type UserImportState = {
  fileName: string;
  rows: UserPreviewRow[] | null;
  lepas: { nip: string; nama: string }[];
  nonaktifNips: string[];
  outletOptions: { id: string; name: string }[];
};

export default function ImportManager() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [busySync, setBusySync] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setResult(null);
    setFileName(f.name);
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const first =
        wb.SheetNames.find((n) => n.toUpperCase().includes("KODE OUTLET")) ?? wb.SheetNames[0];
      const ws = wb.Sheets[first];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const codes = await getOutletCodes();
      const codeSet = new Set(codes.map((c) => String(c).trim()));

      const seen = new Set<string>();
      const parsed: PreviewRow[] = [];
      for (const row of raw) {
        const r: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) r[String(k).trim()] = v;
        const code = String(r["KODE OUTLET"] ?? "").trim();
        if (!code) continue;
        if (seen.has(code)) continue;
        seen.add(code);
        parsed.push({
          code_outlet: code,
          name: String(r["Nama Outlet"] ?? "").trim(),
          grsm: String(r["Nama GRSM"] ?? "").trim(),
          area: String(r["AREA"] ?? "").trim(),
          channel_group: String(r["Channel"] ?? "").trim(),
          code_subdist: String(r["KODE SUBDIST"] ?? "").trim(),
          mode: codeSet.has(code) ? "update" : "baru",
        });
      }
      setRows(parsed);
    } catch {
      setRows(null);
      setResult({ ok: false, msg: "Gagal membaca file. Pastikan format Excel valid." });
    } finally {
      setBusy(false);
    }
  }

  async function doSync() {
    if (!rows?.length) return;
    setBusySync(true);
    setResult(null);
    const res = await syncOutlets(rows);
    setBusySync(false);
    if (res.success) {
      setResult({ ok: true, msg: `Sinkronisasi selesai. ${res.synced} outlet diproses (upsert by code).` });
      setRows(null);
    } else {
      setResult({ ok: false, msg: res.error });
    }
  }

  // ---------- Import Users ----------
  const [u, setU] = useState<UserImportState>({
    fileName: "",
    rows: null,
    lepas: [],
    nonaktifNips: [],
    outletOptions: [],
  });
  const [resolveMap, setResolveMap] = useState<Record<string, string>>({});
  const [userTab, setUserTab] = useState<"all" | "baru" | "changed" | "same">("all");
  const [busyUsers, setBusyUsers] = useState(false);
  const [busyApply, setBusyApply] = useState(false);
  const [resultUsers, setResultUsers] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmLepas, setConfirmLepas] = useState(true);

  function pickUserFields(r: Record<string, unknown>, status: "active" | "backup" = "active"): UserImportRow {
    const T = (v: unknown) => String(v ?? "").trim();
    return {
      nip: T(r["NIP"]),
      nama: T(r["NAMA (SESUAI KTP)"] || r["NAMA SPG"] || r["NAMA"]),
      phone: T(r["NO. TLP"] || r["NO TLP"] || r["TELEPON"]),
      area: T(r["AREA"]),
      regional: T(r["REGIONAL"]),
      jabatan: T(r["JABATAN"] || r["ROLE"]),
      nama_toko: T(r["NAMA TOKO"] || r["OUTLET"]),
      nama_tl: T(r["TEAM LEADER"] || r["TL"] || r["ATASAN"] || r["AT"] || r["SPV"]),
      status,
    };
  }

  function downloadUserTemplate() {
    const templateData = [
      {
        NIP: "21086",
        "NAMA (SESUAI KTP)": "SRI YULI ASTUTI",
        "NO. TLP": "08123456789",
        AREA: "TASIK",
        REGIONAL: "JAWA BARAT",
        JABATAN: "SPG",
        "NAMA TOKO": "KAIRO",
        "TEAM LEADER": "FAHMI LUKMANUL HAKIM",
      },
      {
        NIP: "21087",
        "NAMA (SESUAI KTP)": "FAHMI LUKMANUL HAKIM",
        "NO. TLP": "08129876543",
        AREA: "TASIK",
        REGIONAL: "JAWA BARAT",
        JABATAN: "TL",
        "NAMA TOKO": "",
        "TEAM LEADER": "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "AKTIF");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TEMPLATE_IMPORT_USER_TAKTIS.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileUsers(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setResultUsers(null);
    setBusyUsers(true);
    setUserTab("all");
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed: UserImportRow[] = [];
      const nonaktifNips: string[] = [];
      for (const sn of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sn], { defval: "" });
        const up = sn.toUpperCase();
        if (up.includes("NON AKTIF")) {
          rows.forEach((r) => {
            const nip = String(r["NIP"] ?? "").trim();
            if (nip) nonaktifNips.push(nip);
          });
        } else if (up.includes("BACK UP") || up.includes("BACKUP")) {
          parsed.push(...rows.map((r) => pickUserFields(r, "backup")));
        } else {
          parsed.push(...rows.map((r) => pickUserFields(r, "active")));
        }
      }
      const res = await getUserImportPreview(parsed);
      if (!res.success) {
        setResultUsers({ ok: false, msg: res.error });
        setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [], outletOptions: [] });
        setResolveMap({});
        return;
      }
      setU({
        fileName: f.name,
        rows: res.preview,
        lepas: res.lepas,
        nonaktifNips,
        outletOptions: res.outletOptions,
      });
      setResolveMap({});
    } catch {
      setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [], outletOptions: [] });
      setResolveMap({});
      setResultUsers({ ok: false, msg: "Gagal membaca file. Pastikan format Excel valid." });
    } finally {
      setBusyUsers(false);
    }
  }

  async function doApplyUsers() {
    if (!u.rows) return;
    setBusyApply(true);
    setResultUsers(null);

    const deactivateNips = [...u.nonaktifNips];
    if (confirmLepas && u.lepas.length > 0) {
      deactivateNips.push(...u.lepas.map((l) => l.nip));
    }

    const outletResolve = u.rows.map(
      (r) => resolveMap[`${r.nip}|${r.nama}`] ?? null
    );

    const res = await applyUserImport({
      rows: u.rows.map((r) => ({
        nip: r.nip,
        nama: r.nama,
        phone: r.phone,
        area: r.area,
        regional: r.regional,
        jabatan: r.jabatan,
        nama_toko: r.nama_toko,
        nama_tl: r.nama_tl,
        status: r.status,
      })),
      deactivateNips,
      outletResolve,
    });
    setBusyApply(false);

    if (res.success) {
      setResultUsers({
        ok: true,
        msg: `Selesai! ${res.inserted} user baru ditambah, ${res.updated} user di-update, ${res.deactivated} user dinonaktifkan.`,
      });
      setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [], outletOptions: [] });
      setResolveMap({});
    } else {
      setResultUsers({ ok: false, msg: res.error });
    }
  }

  const uBaru = useMemo(() => u.rows?.filter((r) => r.mode === "baru").length ?? 0, [u.rows]);
  const uChanged = useMemo(
    () => u.rows?.filter((r) => r.mode === "update" && r.hasChanges).length ?? 0,
    [u.rows]
  );
  const uSame = useMemo(
    () => u.rows?.filter((r) => r.mode === "update" && !r.hasChanges).length ?? 0,
    [u.rows]
  );

  const needOutlet = useMemo(
    () => u.rows?.filter((r) => r.nama_toko && r.outletMatch === "none") ?? [],
    [u.rows]
  );
  const shakyOutlet = useMemo(
    () => u.rows?.filter((r) => r.nama_toko && r.outletMatch === "contains") ?? [],
    [u.rows]
  );
  const outletUnresolved = useMemo(
    () => needOutlet.some((r) => !resolveMap[`${r.nip}|${r.nama}`]),
    [needOutlet, resolveMap]
  );
  const outletName = (id: string | null) => u.outletOptions.find((o) => o.id === id)?.name;

  const filteredUserRows = useMemo(() => {
    if (!u.rows) return [];
    if (userTab === "baru") return u.rows.filter((r) => r.mode === "baru");
    if (userTab === "changed") return u.rows.filter((r) => r.mode === "update" && r.hasChanges);
    if (userTab === "same") return u.rows.filter((r) => r.mode === "update" && !r.hasChanges);
    return u.rows;
  }, [u.rows, userTab]);

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Import Outlets ===== */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[16px] font-bold text-slate-900">Import Master Outlet</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={handleFile}
                aria-label="Pilih file Excel outlet"
              />
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[14px] font-semibold text-white transition hover:bg-slate-800">
                <Icon name="upload" size={18} />
                {busy ? "Membaca..." : "Pilih File Master Outlet"}
              </span>
            </label>
            {fileName && <span className="truncate font-mono text-[12px] text-emerald-600">{fileName}</span>}
          </div>
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

        {rows && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <h3 className="text-[15px] font-semibold text-slate-900">Preview Master Outlet</h3>
                <div className="flex gap-2 text-[12px] font-semibold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                    {rows.filter((r) => r.mode === "baru").length} Baru
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700">
                    {rows.filter((r) => r.mode === "update").length} Update
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 font-semibold">Mode</th>
                      <th className="px-4 py-2.5 font-semibold">GRSM</th>
                      <th className="px-4 py-2.5 font-semibold">Kode</th>
                      <th className="px-4 py-2.5 font-semibold">Nama Toko</th>
                      <th className="px-4 py-2.5 font-semibold">Area</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 50).map((r) => (
                      <tr key={r.code_outlet} className="transition hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[11px] font-bold",
                              r.mode === "baru" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                            )}
                          >
                            {r.mode}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{r.grsm || "-"}</td>
                        <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.code_outlet}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{r.name || "-"}</td>
                        <td className="px-4 py-2.5 text-slate-500">{r.area || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">
                  +{rows.length - 50} baris lainnya (total {rows.length}).
                </p>
              )}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
                <button
                  onClick={() => setRows(null)}
                  className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={doSync}
                  disabled={busySync}
                  className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[14px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Icon name="check" size={18} />
                  {busySync ? "Menyimpan..." : `Sync ${rows.length} Outlet`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Import Users ===== */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Import &amp; Sync Users</h2>
              </div>
            <button
              type="button"
              onClick={downloadUserTemplate}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              <Icon name="download" size={15} />
              Download Template XLSX
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={handleFileUsers}
                aria-label="Pilih file Excel users"
              />
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[14px] font-semibold text-white transition hover:bg-slate-800">
                <Icon name="upload" size={18} />
                {busyUsers ? "Membaca..." : "Pilih File Excel Users"}
              </span>
            </label>
            {u.fileName && <span className="truncate font-mono text-[12px] text-emerald-600">{u.fileName}</span>}
          </div>
          <p className="text-[12px] text-slate-400">
            Dapat menggunakan file <span className="font-mono">DATABASE M4</span> atau template kosong di atas.
            Sistem otomatis mencocokkan via NIP &amp; Nama Lengkap.
          </p>
        </div>

        {resultUsers && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium",
              resultUsers.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            <Icon name={resultUsers.ok ? "check" : "warning"} size={16} />
            {resultUsers.msg}
          </div>
        )}

        {u.rows && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <h3 className="text-[15px] font-semibold text-slate-900">Preview Reconciliation User</h3>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUserTab("all")}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold transition",
                      userTab === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Semua ({u.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTab("baru")}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold transition",
                      userTab === "baru"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    User Baru ({uBaru})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTab("changed")}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold transition",
                      userTab === "changed"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    )}
                  >
                    Ada Perubahan ({uChanged})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserTab("same")}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-bold transition",
                      userTab === "same"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    Sama ({uSame})
                  </button>
                </div>
              </div>

              {(needOutlet.length > 0 || shakyOutlet.length > 0) && (
                <div className="flex flex-col gap-1.5 border-b border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-amber-800">
                    <Icon name="warning" size={15} />
                    {needOutlet.length > 0 && (
                      <span>
                        {needOutlet.length} SPG dengan toko tidak ditemukan — wajib pilih toko
                        di kolom Toko Target.
                      </span>
                    )}
                    {shakyOutlet.length > 0 && (
                      <span>
                        {shakyOutlet.length} toko cocok samar (kemungkinan salah map) — cek
                        dropdown-nya, kosongkan tidak masalah.
                      </span>
                    )}
                  </div>
                  {outletUnresolved && (
                    <p className="text-[12px] font-medium text-rose-700">
                      Belum semua toko dipilih. Tombol Terapkan terkunci sampai selesai.
                    </p>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 font-semibold">Status Rekon</th>
                      <th className="px-4 py-2.5 font-semibold">NIP</th>
                      <th className="px-4 py-2.5 font-semibold">Nama</th>
                      <th className="px-4 py-2.5 font-semibold">Role</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Team Leader</th>
                      <th className="px-4 py-2.5 font-semibold">Toko Target</th>
                      <th className="px-4 py-2.5 font-semibold">Rincian Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUserRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-slate-400">
                          Tidak ada user dalam kategori ini.
                        </td>
                      </tr>
                    ) : (
                      filteredUserRows.slice(0, 60).map((r, i) => (
                        <tr key={`${r.nip}-${i}`} className="transition hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-bold",
                                r.mode === "baru"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : r.hasChanges
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {r.mode === "baru" ? "BARU" : r.hasChanges ? "UPDATE" : "SAMA"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{r.nip || "-"}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{r.nama}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                r.role === "tl"
                                  ? "bg-violet-50 text-violet-600"
                                  : "bg-indigo-50 text-indigo-600"
                              )}
                            >
                              {r.role === "tl" ? "Team Leader" : "SPG"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                r.status === "backup"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-emerald-50 text-emerald-600"
                              )}
                            >
                              {r.status === "backup" ? "BACKUP" : "AKTIF"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{r.nama_tl || "-"}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[12px] text-slate-600">{r.nama_toko || "-"}</span>
                              {r.nama_toko && (
                                r.outletMatch === "none" || r.outletMatch === "contains" ? (
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className={cn(
                                        "w-fit rounded px-1.5 py-0.5 text-[10px] font-bold",
                                        r.outletMatch === "none"
                                          ? "bg-rose-50 text-rose-600"
                                          : "bg-amber-50 text-amber-700"
                                      )}
                                    >
                                      {r.outletMatch === "none" ? "TOKO TIDAK DITEMUKAN" : "COCOK SAMAR"}
                                    </span>
                                    <select
                                      value={
                                        resolveMap[`${r.nip}|${r.nama}`] ??
                                        (r.outletMatch === "contains" ? r.outletId ?? "" : "")
                                      }
                                      onChange={(e) =>
                                        setResolveMap((prev) => ({
                                          ...prev,
                                          [`${r.nip}|${r.nama}`]: e.target.value,
                                        }))
                                      }
                                      className="h-8 w-full min-w-[220px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-indigo-500"
                                    >
                                      <option value="">— Pilih toko —</option>
                                      {u.outletOptions.map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <Icon name="check" size={12} />
                                    {outletName(r.outletId) ?? "-"}
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {r.mode === "baru" ? (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  User Baru (Insert)
                                </span>
                              ) : r.changes && r.changes.length > 0 ? (
                                r.changes.map((ch, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                                  >
                                    {ch}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400">Tidak ada perubahan</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredUserRows.length > 60 && (
                <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">
                  +{filteredUserRows.length - 60} user lainnya (total {filteredUserRows.length}).
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
                <button
                  onClick={() => setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [], outletOptions: [] })}
                  className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={doApplyUsers}
                  disabled={busyApply || outletUnresolved}
                  className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[14px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Icon name="check" size={18} />
                  {busyApply ? "Menyimpan..." : `Terapkan ${u.rows.length} User`}
                </button>
              </div>
            </div>

            {u.nonaktifNips.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                <Icon name="warning" size={16} />
                {u.nonaktifNips.length} orang dari sheet NON AKTIF akan dinonaktifkan.
              </div>
            )}

            {u.lepas.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
                  <h3 className="text-[14px] font-semibold text-amber-800">
                    {u.lepas.length} user aktif tidak ada di file (diduga resign)
                  </h3>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-amber-800">
                    <input
                      type="checkbox"
                      checked={confirmLepas}
                      onChange={(e) => setConfirmLepas(e.target.checked)}
                      className="h-4 w-4 accent-amber-600"
                    />
                    Nonaktifkan otomatis
                  </label>
                </div>
                <div className="max-h-40 overflow-y-auto p-4 text-[12px] text-slate-600">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {u.lepas.map((l) => (
                      <div key={l.nip} className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-amber-700">{l.nip}</span>
                        <span className="truncate text-slate-500">({l.nama})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
