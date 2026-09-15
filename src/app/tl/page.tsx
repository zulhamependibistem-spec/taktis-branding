import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, logoutService } from "@/lib/auth";
import { getTeamAttendanceToday } from "@/lib/actions/tl";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";
import { cn } from "@/lib/utils";
import { timeWIB, dateWIBLabel } from "@/lib/date";

type Row = {
  id: string;
  initials: string;
  name: string;
  outlet: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  omzet: number;
  qty: number;
};

const HADIR = ["checked_in", "checked_out"];

function fmtRp(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function TlDashboard() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const res = await getTeamAttendanceToday();
  const list: Row[] = res.success ? (res.list as unknown as Row[]) : [];
  const summary = res.success && res.summary ? res.summary : { totalOmzet: 0, totalQty: 0 };

  const date = dateWIBLabel();
  const hadir = list.filter((s) => HADIR.includes(s.status)).length;
  const belum = list.filter((s) => s.status === "not_checked_in").length;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24 md:max-w-6xl">
      {/* Header */}
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-slate-900">Dashboard Team Leader</h1>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {date} · {list.length} SPG binaan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              {me?.full_name?.charAt(0) ?? "TL"}
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar"
                aria-label="Keluar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
        {me?.full_name && <p className="text-[13px] text-slate-600">Halo, {me.full_name}</p>}
      </header>

      <main className="flex flex-col gap-4 p-4">
        {!res.success && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {res.error}
          </p>
        )}
        {/* Banner Total Sales Tim Hari Ini */}
        <section className="relative overflow-hidden rounded-2xl bg-indigo-700 p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/5" />
          <p className="text-[12px] font-medium text-white/80">Total Sales Tim Hari Ini</p>
          <h2 className="mt-1 font-mono text-[26px] font-extrabold leading-tight">
            {fmtRp(summary.totalOmzet)}
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur-sm">
              <Icon name="analytics" size={14} />
              {summary.totalQty.toLocaleString("id-ID")} pcs terjual
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur-sm">
              <Icon name="users" size={14} />
              {hadir}/{list.length} SPG aktif
            </span>
          </div>
        </section>

        {/* Menu Akses Cepat */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/tl/attendance"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-3 text-center transition hover:bg-slate-50 active:scale-95 shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon name="users" size={18} />
            </span>
            <span className="text-[12px] font-bold text-slate-800">Absensi Tim</span>
          </Link>
          <Link
            href="/tl/harga"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-3 text-center transition hover:bg-slate-50 active:scale-95 shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="edit" size={18} />
            </span>
            <span className="text-[12px] font-bold text-slate-800">Harga Toko</span>
          </Link>
          <Link
            href="/tl/performa"
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white p-3 text-center transition hover:bg-slate-50 active:scale-95 shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="analytics" size={18} />
            </span>
            <span className="text-[12px] font-bold text-slate-800">Performa</span>
          </Link>
        </div>

        {/* Ringkasan Kehadiran */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            <span className="font-mono text-xl font-bold">{hadir}</span>
            <span className="text-[12px] font-semibold">Hadir</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-600">
            <span className="font-mono text-xl font-bold">{belum}</span>
            <span className="text-[12px] font-semibold">Belum</span>
          </div>
        </div>

        {list.length === 0 && (
          <p className="pt-10 text-center text-sm text-slate-400">Belum ada SPG binaan.</p>
        )}

        {/* Daftar SPG Binaan */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const off = s.status === "not_checked_in";
            return (
              <div
                key={s.id}
                className="rounded-xl bg-white p-4 shadow-sm"
              >
                <div className={cn("flex items-center gap-3", off && "opacity-60")}>
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      off ? "bg-slate-100 text-slate-500" : "bg-indigo-600/10 text-indigo-600"
                    )}
                  >
                    {s.initials || <Icon name="woman" size={20} filled />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900">{s.name}</h3>
                    <p className="flex items-center gap-1 truncate text-[12px] text-slate-500">
                      <Icon name="store" size={13} />
                      {s.outlet}
                    </p>
                    {s.omzet > 0 && (
                      <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-600">
                        {fmtRp(s.omzet)} ({s.qty} pcs)
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusPill status={s.status} />
                    {s.check_in_time && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{timeWIB(s.check_in_time)} WIB</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav active="beranda" items={TL_NAV} />
    </div>
  );
}
