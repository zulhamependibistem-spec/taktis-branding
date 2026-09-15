"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import FitPanel from "@/components/admin/FitPanel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toggleUserStatus, deleteUserAction, deleteInactiveUsersAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

type Role = "spg" | "tl" | "pic" | "admin";
type Row = {
  id: string;
  nip: string | null;
  nama: string;
  hp: string | null;
  role: Role;
  outlet: string;
  tl: string;
  status: "active" | "inactive" | "backup";
};

const ROLE_LABEL: Record<Role, string> = { spg: "SPG", tl: "Team Leader", pic: "PIC", admin: "Admin" };
const ROLE_BADGE: Record<Role, string> = {
  spg: "bg-indigo-50 text-indigo-600",
  tl: "bg-violet-50 text-violet-600",
  pic: "bg-cyan-50 text-cyan-600",
  admin: "bg-amber-50 text-amber-600",
};

const inputCls =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const selectCls =
  "h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-[14px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function UsersManager({ initial, loadError }: { initial: Row[]; loadError: string | null }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const { ask, dialog } = useConfirmDialog();

  async function toggle(id: string) {
    setBusyId(id);
    setActionMsg(null);
    const res = await toggleUserStatus(id);
    setBusyId(null);
    if (!res.success) {
      setActionMsg(res.error);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: res.status } : r)));
  }

  async function handleDelete(id: string, name: string) {
    const ok = await ask({
      title: "Hapus User",
      message: `Yakin ingin menghapus user ${name}? Tindakan ini permanen.`,
      confirmText: "Hapus",
      danger: true,
    });
    if (!ok) return;
    setBusyId(id);
    setActionMsg(null);
    const res = await deleteUserAction(id);
    setBusyId(null);
    if (!res.success) {
      setActionMsg(res.error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDeleteAllInactive() {
    const ok = await ask({
      title: "Hapus Semua User Nonaktif",
      message: `Hapus ${inactiveCount} user berstatus nonaktif sekaligus? Tindakan ini permanen.`,
      confirmText: "Hapus Semua",
      danger: true,
    });
    if (!ok) return;
    setBusyId("__all__");
    setActionMsg(null);
    const res = await deleteInactiveUsersAction();
    setBusyId(null);
    if (!res.success) {
      setActionMsg(res.error);
      return;
    }
    setActionMsg(null);
    setRows((prev) => prev.filter((r) => r.status !== "inactive"));
  }

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const r of rows) {
      if (r.status === "active") active++;
      else if (r.status === "inactive") inactive++;
    }
    return { active, inactive };
  }, [rows]);
  const activeCount = counts.active;
  const inactiveCount = counts.inactive;

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = query.trim().toLowerCase();
        const matchQuery =
          q === "" || (r.nip?.toLowerCase().includes(q) ?? false) || r.nama.toLowerCase().includes(q);
        const matchRole = roleFilter === "all" || r.role === roleFilter;
        const matchStatus = statusFilter === "all" || r.status === statusFilter;
        return matchQuery && matchRole && matchStatus;
      }),
    [rows, query, roleFilter, statusFilter]
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Users</h1>
        </div>
        {inactiveCount > 0 && (
          <button
            type="button"
            onClick={handleDeleteAllInactive}
            disabled={busyId === "__all__"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
          >
            <Icon name="delete" size={15} />
            {busyId === "__all__" ? "Menghapus..." : `Hapus ${inactiveCount} User Nonaktif`}
          </button>
        )}
      </header>

      {loadError && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{loadError}</p>}
      {actionMsg && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{actionMsg}</p>}

      {/* Quick Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition active:scale-95",
            statusFilter === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          Semua User
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
            {rows.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition active:scale-95",
            statusFilter === "active"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70"
          )}
        >
          User Aktif
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusFilter === "active" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800")}>
            {activeCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("inactive")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition active:scale-95",
            statusFilter === "inactive"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70"
          )}
        >
          User Nonaktif
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusFilter === "inactive" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800")}>
            {inactiveCount}
          </span>
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari NIP atau Nama..."
            className={cn(inputCls, "pl-11")}
          />
        </div>
        <div className="relative min-w-[160px]">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={selectCls}
          >
            <option value="all">Semua Role</option>
            <option value="spg">SPG</option>
            <option value="tl">Team Leader</option>
            <option value="pic">PIC</option>
            <option value="admin">Admin</option>
          </select>
          <Icon
            name="chevronDown"
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
        <div className="relative min-w-[160px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectCls}
          >
            <option value="all">Semua Status</option>
            <option value="active">Active (Aktif)</option>
            <option value="inactive">Inactive (Nonaktif)</option>
          </select>
          <Icon
            name="chevronDown"
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <FitPanel>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">NIP</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">No. HP</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Outlet</th>
                <th className="px-4 py-3 font-semibold">Team Leader</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Icon name="search" size={24} />
                      </div>
                      <p className="text-[14px] font-bold text-slate-800">Tidak ada user ditemukan</p>
                      <p className="mt-1 text-[12px] text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau ganti filter status.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("all");
                          setRoleFilter("all");
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-500">{r.nip ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.nama}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-500">{r.hp ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                          ROLE_BADGE[r.role]
                        )}
                      >
                        {ROLE_LABEL[r.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.outlet}</td>
                    <td className="px-4 py-3 text-slate-500">{r.tl}</td>
                    <td className="px-4 py-3 text-left">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(r.id)}
                          disabled={busyId === r.id}
                          className={cn(
                            "inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-semibold transition active:scale-95 disabled:opacity-50",
                            r.status === "active"
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          {busyId === r.id ? "..." : r.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r.nama)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 transition active:scale-95 disabled:opacity-50"
                        >
                          <Icon name="delete" size={14} />
                          {busyId === r.id ? "..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FitPanel>
      {dialog}
    </div>
  );
}
