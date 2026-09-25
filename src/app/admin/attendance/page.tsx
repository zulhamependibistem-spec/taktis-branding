import { getAttendanceOverview } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth";
import { todayWIB } from "@/lib/date";
import AdminShell from "@/components/admin/AdminShell";
import AttendanceView, { type AttRow } from "@/components/admin/AttendanceView";

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  const { tanggal } = await searchParams;
  const me = await getSessionUser();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(tanggal ?? "") ? tanggal! : undefined;
  const res = await getAttendanceOverview(date);
  const rows: AttRow[] = res.success ? res.list : [];
  const isAdmin = me?.role === "admin";

  return (
    <AdminShell active="attendance">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        </div>
      </header>
      {res.success ? (
        <AttendanceView rows={rows} isAdmin={isAdmin} date={res.date} today={todayWIB()} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {res.error}
        </p>
      )}
    </AdminShell>
  );
}