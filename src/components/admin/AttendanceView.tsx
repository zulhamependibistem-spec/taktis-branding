"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { timeWIB } from "@/lib/date";
import { resetAttendanceAction } from "@/lib/actions/admin";

export type AttRow = {
  id: string;
  attendanceId?: string | null;
  role: string;
  name: string;
  nip: string | null;
  area: string;
  tl: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  lat: number | null;
  lng: number | null;
};

function initials(name: string) {
  return String(name)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PhotoCell({
  label,
  time,
  photo,
  onOpen,
}: {
  label: string;
  time: string | null;
  photo: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!photo}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition",
        photo ? "border-slate-200 hover:bg-slate-50" : "cursor-default border-dashed border-slate-200 opacity-60"
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={label} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <Icon name="camera" size={18} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-mono text-[13px] font-semibold text-slate-800">{time ? `${time} WIB` : "—"}</p>
      </div>
      {!photo && <span className="ml-auto text-[10px] font-semibold text-slate-400">belum ada foto</span>}
    </button>
  );
}

export default function AttendanceView({
  rows,
  isAdmin = false,
}: {
  rows: AttRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "hadir" | "belum">("all");
  const [preview, setPreview] = useState<{ photo: string; label: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const { ask, dialog } = useConfirmDialog();

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const hadir = rows.filter((r) => r.status === "checked_in" || r.status === "checked_out").length;
  const belum = rows.filter((r) => r.status === "not_checked_in").length;

  const filteredRows = rows.filter((r) => {
    if (filter === "hadir") return r.status === "checked_in" || r.status === "checked_out";
    if (filter === "belum") return r.status === "not_checked_in";
    return true;
  });

  async function exportXLSX() {
    const list = filteredRows.map((r) => ({
      AREA: r.area || "-",
      ROLE: r.role.toUpperCase(),
      "NAMA SPG": r.name,
      NIP: r.nip || "-",
      "NAMA SUPERVISOR": r.tl,
      STATUS: r.status === "checked_out" ? "Check Out" : r.status === "checked_in" ? "Check In" : "Belum Absen",
      "JAM CHECK IN": r.checkInTime ? `${timeWIB(r.checkInTime)} WIB` : "-",
      "JAM CHECK OUT": r.checkOutTime ? `${timeWIB(r.checkOutTime)} WIB` : "-",
      LATITUDE: r.lat ?? "",
      LONGITUDE: r.lng ?? "",
      "URL FOTO CHECK IN": r.checkInPhoto ? `=HYPERLINK("${r.checkInPhoto}", "Lihat Foto Check-In")` : "",
      "URL FOTO CHECK OUT": r.checkOutPhoto ? `=HYPERLINK("${r.checkOutPhoto}", "Lihat Foto Check-Out")` : "",
    }));

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(list);
    ws["!cols"] = [
      { wch: 14 }, // AREA
      { wch: 8 },  // ROLE
      { wch: 26 }, // NAMA
      { wch: 16 }, // NIP
      { wch: 24 }, // SUPERVISOR
      { wch: 16 }, // STATUS
      { wch: 16 }, // CHECK IN
      { wch: 16 }, // CHECK OUT
      { wch: 14 }, // LAT
      { wch: 14 }, // LNG
      { wch: 50 }, // URL FOTO CHECK IN
      { wch: 50 }, // URL FOTO CHECK OUT
    ];
    XLSX.utils.book_append_sheet(wb, ws, "DATA ABSENSI");
    const dStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ABSENSI_${dStr}.xlsx`);
  }

  async function handleReset(attId: string, name: string) {
    const ok = await ask({
      title: "Reset Absensi",
      message: `Hapus foto & reset absensi ${name}? SPG dapat absen ulang setelah ini.`,
      confirmText: "Hapus & Reset",
      danger: true,
    });
    if (!ok) return;
    setBusyId(attId);
    setResetErr(null);
    const res = await resetAttendanceAction(attId);
    setBusyId(null);
    if (!res.success) {
      setResetErr(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {resetErr && (
        <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{resetErr}</p>
      )}
      {/* Stat Summary & Interactive Filter Cards */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFilter(filter === "hadir" ? "all" : "hadir")}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border p-3 transition text-center active:scale-95",
              filter === "hadir"
                ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-500/30 text-emerald-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
            )}
          >
            <span className="font-mono text-xl font-bold">{hadir}</span>
            <span className="text-[12px] font-semibold">Hadir</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter(filter === "belum" ? "all" : "belum")}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border p-3 transition text-center active:scale-95",
              filter === "belum"
                ? "border-rose-500 bg-rose-100 ring-2 ring-rose-500/30 text-rose-800"
                : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100/70"
            )}
          >
            <span className="font-mono text-xl font-bold">{belum}</span>
            <span className="text-[12px] font-semibold">Belum absen</span>
          </button>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={exportXLSX}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700 active:scale-95 shadow-sm"
          >
            <Icon name="download" size={18} />
            Export Absensi (.xlsx)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-bold transition",
            filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Semua ({rows.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("hadir")}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-bold transition",
            filter === "hadir" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Hadir ({hadir})
        </button>
        <button
          type="button"
          onClick={() => setFilter("belum")}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-bold transition",
            filter === "belum" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Belum Absen ({belum})
        </button>
      </div>

      {filteredRows.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          {filter === "hadir"
            ? "Belum ada yang absen hari ini."
            : filter === "belum"
              ? "Semua SPG sudah absen hari ini!"
              : "Tidak ada SPG terdaftar."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filteredRows.map((r) => {
          const off = r.status === "not_checked_in";
          return (
            <div
              key={r.id}
              className={cn("flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm", off && "opacity-70")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    off ? "bg-slate-100 text-slate-500" : "bg-indigo-600/10 text-indigo-600"
                  )}
                >
                  {r.role === "tl" ? initials(r.name) : <Icon name="woman" size={20} filled />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900">
                    {r.name}
                    {r.role === "tl" && (
                      <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Team Leader
                      </span>
                    )}
                  </h3>
                  <p className="truncate text-[12px] text-slate-500">
                    {r.nip && <span className="mr-1.5 font-mono">{r.nip}</span>}
                    {r.area}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusPill status={r.status} />
                  {r.checkInTime && !r.checkOutTime && (
                    <p className="mt-0.5 font-mono text-[10px] font-medium text-amber-600">{timeWIB(r.checkInTime)} WIB</p>
                  )}
                  {r.checkOutTime && (
                    <p className="mt-0.5 font-mono text-[10px] font-medium text-slate-400">
                      {r.checkInTime ? `${timeWIB(r.checkInTime)} → ` : ""}
                      {timeWIB(r.checkOutTime)} WIB
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PhotoCell
                  label="Check-in"
                  time={r.checkInTime}
                  photo={r.checkInPhoto}
                  onOpen={() => r.checkInPhoto && setPreview({ photo: r.checkInPhoto, label: `Check-in ${r.name}` })}
                />
                <PhotoCell
                  label="Check-out"
                  time={r.checkOutTime}
                  photo={r.checkOutPhoto}
                  onOpen={() => r.checkOutPhoto && setPreview({ photo: r.checkOutPhoto, label: `Check-out ${r.name}` })}
                />
              </div>

              {r.attendanceId && (
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={busyId === r.attendanceId}
                    onClick={() => handleReset(r.attendanceId!, r.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                  >
                    <Icon name="delete" size={13} />
                    {busyId === r.attendanceId ? "Menghapus..." : "Hapus & Reset Absen"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dialog}
      {preview && (
        <div
          className="fixed inset-0 z-overlay flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-bold text-slate-900">{preview.label}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.photo} alt={preview.label} className="max-h-[70vh] w-full object-contain bg-slate-950" />
          </div>
        </div>
      )}
    </div>
  );
}