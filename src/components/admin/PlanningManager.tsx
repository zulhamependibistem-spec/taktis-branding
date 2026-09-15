"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  deletePlanning,
  getPlanningList,
  getPlanningMonth,
  savePlanning,
  type PlanningOutlet,
  type PlanningSummary,
} from "@/lib/actions/admin";
import { Icon } from "@/components/ui/Icon";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${names[Number(mo) - 1]} ${y}`;
}

type Mode =
  | { view: "list" }
  | { view: "detail"; month: string }
  | { view: "edit"; month: string };

export default function PlanningManager() {
  const [list, setList] = useState<PlanningSummary[]>([]);
  const [mode, setMode] = useState<Mode>({ view: "list" });
  const [query, setQuery] = useState("");
  const [grsm, setGrsm] = useState("all");
  const [outlets, setOutlets] = useState<PlanningOutlet[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const { ask, dialog } = useConfirmDialog();

  const flash = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshList = useCallback(() => {
    getPlanningList().then((res) => {
      if (res.success) setList(res.list);
    });
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Load full master + current selection for a month (used by detail & edit)
  const loadMonth = useCallback((month: string) => {
    getPlanningMonth(month).then((res) => {
      if (!res.success) return flash("err", res.error);
      setOutlets(res.outlets);
      setSelected(new Set(res.plannedIds));
    });
  }, []);

  const grsmList = useMemo(
    () => [...new Set(outlets.map((o) => o.grsm).filter(Boolean))].sort(),
    [outlets]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return outlets.filter((o) => {
      if (grsm !== "all" && o.grsm !== grsm) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.code_outlet.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q)
      );
    });
  }, [outlets, query, grsm]);

  const plannedOutlets = useMemo(() => outlets.filter((o) => selected.has(o.id)), [outlets, selected]);

  const visibleAll = filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((o) => {
        if (visibleAll) next.delete(o.id);
        else next.add(o.id);
      });
      return next;
    });
  };

  const handleSave = () => {
    if (mode.view !== "edit") return;
    const month = mode.month;
    setSaving(async () => {
      const res = await savePlanning(month, [...selected]);
      if (res.success) {
        flash("ok", "Planning tersimpan.");
        refreshList();
        setMode({ view: "detail", month });
        setQuery("");
        setGrsm("all");
      } else {
        flash("err", res.error);
      }
    });
  };

  const handleDelete = async (month: string) => {
    const ok = await ask({
      title: "Hapus Planning",
      message: `Hapus planning ${monthLabel(month)}?`,
      confirmText: "Hapus",
      danger: true,
    });
    if (!ok) return;
    setDeleting(month);
    deletePlanning(month).then((res) => {
      setDeleting(null);
      if (res.success) {
        flash("ok", "Planning dihapus.");
        refreshList();
        setMode({ view: "list" });
      } else {
        flash("err", res.error);
      }
    });
  };

  const openDetail = (month: string) => {
    setMode({ view: "detail", month });
    setQuery("");
    setGrsm("all");
    loadMonth(month);
  };

  const openEdit = (month: string) => {
    setMode({ view: "edit", month });
    setQuery("");
    setGrsm("all");
    loadMonth(month);
  };

  const month = mode.view !== "list" ? mode.month : "";

  // ---------- LIST VIEW ----------
  if (mode.view === "list") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-slate-900">Daftar Planning</h3>
          <div className="flex items-center gap-3">
            {toast && (
              <span className={`text-[13px] font-semibold ${toast.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                {toast.msg}
              </span>
            )}
            <button
              onClick={() => openEdit(new Date().toISOString().slice(0, 7))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-500"
            >
              <Icon name="plus" size={16} />
              Buat Planning Baru
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {list.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">
              Belum ada planning. Klik &quot;Buat Planning Baru&quot; untuk mulai.
            </div>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Bulan</th>
                  <th className="px-4 py-2.5 font-semibold">Jumlah Toko</th>
                  <th className="px-4 py-2.5 font-semibold">Terakhir Diubah</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => (
                  <tr key={p.month} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{monthLabel(p.month)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="store" size={16} className="text-slate-400" />
                        <b className="font-mono font-bold text-indigo-600">{p.count}</b> toko
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(p.month)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Buka
                        </button>
                        <button
                          onClick={() => handleDelete(p.month)}
                          disabled={deleting === p.month}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deleting === p.month ? "..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {dialog}
      </div>
    );
  }

  // ---------- DETAIL VIEW (read-only) ----------
  if (mode.view === "detail") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode({ view: "list" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Kembali ke daftar"
            >
              <Icon name="chevronRight" size={16} className="rotate-180" />
            </button>
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Planning {monthLabel(month)}</h3>
              <p className="text-[12px] text-slate-400">{plannedOutlets.length} toko terpilih</p>
            </div>
          </div>
          {toast && (
            <span className={`text-[13px] font-semibold ${toast.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
              {toast.msg}
            </span>
          )}
          <button
            onClick={() => openEdit(month)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-500"
          >
            <Icon name="edit" size={16} />
            Ubah Toko
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {plannedOutlets.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">Belum ada toko untuk bulan ini.</div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">#</th>
                  <th className="px-4 py-2.5 font-semibold">GRSM</th>
                  <th className="px-4 py-2.5 font-semibold">Kode</th>
                  <th className="px-4 py-2.5 font-semibold">Nama Toko</th>
                  <th className="px-4 py-2.5 font-semibold">Area</th>
                  <th className="px-4 py-2.5 font-semibold">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plannedOutlets.map((o, i) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-[12px] text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block whitespace-nowrap rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                        {o.grsm}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{o.code_outlet}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{o.name}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-500">{o.area}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-500">{o.channel_group}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ---------- EDIT VIEW (add/remove outlets) ----------
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode({ view: "detail", month })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Kembali"
          >
            <Icon name="chevronRight" size={16} className="rotate-180" />
          </button>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">
              Ubah Planning {monthLabel(month)}
            </h3>
            <p className="text-[12px] text-slate-400">Centang / hilangkan centang untuk menambah atau menghapus toko</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <span className={`text-[13px] font-semibold ${toast.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
              {toast.msg}
            </span>
          )}
          <span className="text-[13px] text-slate-500">
            <b className="font-mono font-bold text-indigo-600">{selected.size}</b> toko dipilih
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white transition enabled:hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama toko, kode, area..."
              className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={grsm}
            onChange={(e) => setGrsm(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">Semua GRSM</option>
            {grsmList.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            onClick={toggleVisible}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {visibleAll ? "Hapus semua yang tampil" : "Pilih semua yang tampil"}
          </button>
        </div>
        <p className="text-[12px] text-slate-500">
          {filtered.length} dari {outlets.length} toko
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-slate-400">
            {outlets.length === 0 ? "Memuat..." : "Tidak ada toko."}
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Pilih</th>
                <th className="px-4 py-2.5 font-semibold">GRSM</th>
                <th className="px-4 py-2.5 font-semibold">Kode</th>
                <th className="px-4 py-2.5 font-semibold">Nama Toko</th>
                <th className="px-4 py-2.5 font-semibold">Area</th>
                <th className="px-4 py-2.5 font-semibold">Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o, i) => {
                const checked = selected.has(o.id);
                return (
                  <tr
                    key={o.id}
                    onClick={() => toggle(o.id)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 text-[12px] text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block whitespace-nowrap rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                        {o.grsm}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">{o.code_outlet}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{o.name}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-500">{o.area}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-500">{o.channel_group}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}