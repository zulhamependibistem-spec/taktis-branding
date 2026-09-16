import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, logoutService } from "@/lib/auth";
import { getAttendanceOverview } from "@/lib/actions/admin";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";
import { cn } from "@/lib/utils";
import { timeWIB, dateWIBLabel } from "@/lib/date";

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function TlDashboard() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const res = await getAttendanceOverview();
  const rows = res.success ? res.list : [];
  const date = dateWIBLabel();

  const hadir = rows.filter((s) => s.status === "checked_in" || s.status === "checked_out").length;
  const belum = rows.filter((s) => s.status === "not_checked_in").length;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24 md:max-w-6xl">
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-slate-900">Dashboard Team Leader</h1>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {date} · {rows.length} anggota tim
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

        <Link
          href="/tl/attendance"
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-indigo-700 active:scale-95 shadow-sm"
        >
          <Icon name="users" size={18} />
          Detail Absensi Tim
        </Link>

        {rows.length === 0 && (
          <p className="pt-10 text-center text-sm text-slate-400">Belum ada anggota tim.</p>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => {
            const off = s.status === "not_checked_in";
            return (
              <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className={cn("flex items-center gap-3", off && "opacity-60")}>
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      off ? "bg-slate-100 text-slate-500" : "bg-indigo-600/10 text-indigo-600"
                    )}
                  >
                    {s.role === "tl"
                      ? String(s.name).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
                      : <Icon name="woman" size={20} filled />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900">{s.name}</h3>
                    <p className="flex items-center gap-1 truncate text-[12px] text-slate-500">
                      <Icon name="store" size={13} />
                      {s.area}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusPill status={s.status} />
                    {s.checkInTime && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{timeWIB(s.checkInTime)} WIB</p>
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