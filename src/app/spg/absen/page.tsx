import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAttendanceToday } from "@/lib/actions/attendance";
import { dateWIBLabel } from "@/lib/date";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import CheckIn from "../CheckIn";

export default async function SpgAbsenPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const res = await getAttendanceToday();
  const attendance = res.success ? res.attendance : null;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white px-4 py-4">
        <h1 className="text-[20px] font-semibold text-slate-900">Absensi</h1>
        <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
          {dateWIBLabel(new Date(), {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>
      <main className="flex flex-col gap-4 p-4">
        {!res.success && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {res.error}
          </p>
        )}
        <CheckIn initial={attendance as never} userId={me.id} />
        <p className="text-center text-[12px] text-slate-400">
          Verifikasi absensi ditangani Team Leader dari foto & timestamp Anda.
        </p>
      </main>
      <BottomNav active="absen" items={SPG_NAV} />
    </div>
  );
}