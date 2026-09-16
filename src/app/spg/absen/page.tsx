import { redirect } from "next/navigation";
import { getSessionUser, logoutService } from "@/lib/auth";
import { getAttendanceToday } from "@/lib/actions/attendance";
import { dateWIBLabel } from "@/lib/date";
import { Icon } from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import CheckIn from "../CheckIn";

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function SpgAbsenPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const res = await getAttendanceToday();
  const attendance = res.success ? res.attendance : null;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-[20px] font-semibold text-slate-900">Absensi</h1>
            <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {dateWIBLabel(new Date(), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              {me.full_name.charAt(0)}
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