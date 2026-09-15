import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAttendanceToday } from "@/lib/actions/attendance";
import { dateWIBLabel } from "@/lib/date";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";
import CheckIn from "@/app/spg/CheckIn";

export default async function TlAbsenPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const res = await getAttendanceToday();
  const attendance = res.success ? res.attendance : null;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-nav border-t-4 border-indigo-600 bg-white px-4 py-4">
        <h1 className="text-[20px] font-semibold text-slate-900">Absensi Saya</h1>
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
        <CheckIn initial={attendance as never} userId={me.id} />
        <p className="text-center text-[12px] text-slate-400">
          Verifikasi absensi ditangani Anda sendiri dari foto &amp; timestamp.
        </p>
      </main>
      <BottomNav active="absen" items={TL_NAV} />
    </div>
  );
}