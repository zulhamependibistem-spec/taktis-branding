"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  getUserImportPreview,
  applyUserImport,
  type UserImportRow,
} from "@/lib/actions/admin";

type UserPreviewRow = UserImportRow & {
  role: "tl" | "spg";
  mode: "baru" | "update";
  changes?: string[];
  hasChanges?: boolean;
};

type UserImportState = {
  fileName: string;
  rows: UserPreviewRow[] | null;
  lepas: { nip: string; nama: string }[];
  nonaktifNips: string[];
};

export default function ImportManager() {
  const [u, setU] = useState<UserImportState>({
    fileName: "",
    rows: null,
    lepas: [],
    nonaktifNips: [],
  });
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
      pic: T(r["PIC/ADMIN"] || r["PIC"]),
      project: T(r["PROJECT"]),
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
        "PIC/ADMIN": "EKO/ERLITA",
        PROJECT: "M2 TAKTIS TSJ",
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
        "PIC/ADMIN": "EKO/ERLITA",
        PROJECT: "M2 TAKTIS TSJ",
        "NAMA TOKO": "",
        "TEAM LEADER": "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 28 }, { wch: 28 }];
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
        setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [] });
        return;
      }
      setU({
        fileName: f.name,
        rows: res.preview,
        lepas: res.lepas,
        nonaktifNips,
      });
    } catch {
      setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [] });
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

    const res = await applyUserImport({
      rows: u.rows.map((r) => ({
        nip: r.nip,
        nama: r.nama,
        phone: r.phone,
        area: r.area,
        regional: r.regional,
        jabatan: r.jabatan,
        nama_toko: r.nama_toko,
        pic: r.pic,
        project: r.project,
        nama_tl: r.nama_tl,
        status: r.status,
      })),
      deactivateNips,
    });
    setBusyApply(false);

    if (res.success) {
      setResultUsers({
        ok: true,
        msg: `Selesai! ${res.inserted} user baru ditambah, ${res.updated} user di-update, ${res.deactivated} user dinonaktifkan${
          res.skipped ? `, ${res.skipped} dilewati (NIP/HP duplikat)` : "."
        }`,
      });
      setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [] });
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

  const filteredUserRows = useMemo(() => {
    if (!u.rows) return [];
    if (userTab === "baru") return u.rows.filter((r) => r.mode === "baru");
    if (userTab === "changed") return u.rows.filter((r) => r.mode === "update" && r.hasChanges);
    if (userTab === "same") return u.rows.filter((r) => r.mode === "update" && !r.hasChanges);
    return u.rows;
  }, [u.rows, userTab]);

  return (
    <div className="flex flex-col gap-6">
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

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 font-semibold">Status Rekon</th>
                      <th className="px-4 py-2.5 font-semibold">NIP</th>
                      <th className="px-4 py-2.5 font-semibold">Nama</th>
                      <th className="px-4 py-2.5 font-semibold">Role</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Team Leader</th>
                      <th className="px-4 py-2.5 font-semibold">Rincian Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUserRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-slate-400">
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
                  onClick={() => setU({ fileName: "", rows: null, lepas: [], nonaktifNips: [] })}
                  className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={doApplyUsers}
                  disabled={busyApply}
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