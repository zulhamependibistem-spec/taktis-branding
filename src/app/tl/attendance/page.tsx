import { getAttendanceOverview } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth";
import { dateWIBLabel } from "@/lib/date";
import AttendanceView, { type AttRow } from "@/components/admin/AttendanceView";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";

export default async function TlAttendancePage() {
  const me = await getSessionUser();
  const res = await getAttendanceOverview();
  const rows: AttRow[] = res.success ? res.list : [];
  const date = dateWIBLabel();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24 md:max-w-5xl">
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white/90 px-4 py-4 backdrop-blur">
        <h1 className="text-[20px] font-semibold text-slate-900">Absensi Hari Ini</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Tim {me?.full_name ?? "-"} · {date}
        </p>
      </header>
      <main className="p-4">
        {res.success ? (
          <AttendanceView rows={rows} />
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            {res.error}
          </p>
        )}
      </main>
      <BottomNav active="absensi" items={TL_NAV} />
    </div>
  );
}