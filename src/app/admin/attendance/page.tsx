import { getAttendanceOverview } from "@/lib/actions/admin";
import { getSessionUser } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
import AttendanceView, { type AttRow } from "@/components/admin/AttendanceView";

export default async function AdminAttendancePage() {
  const me = await getSessionUser();
  const res = await getAttendanceOverview();
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
        <AttendanceView rows={rows} isAdmin={isAdmin} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {res.error}
        </p>
      )}
    </AdminShell>
  );
}