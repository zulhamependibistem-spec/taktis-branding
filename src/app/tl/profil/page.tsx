import { redirect } from "next/navigation";
import { getSessionUser, logoutService } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function TlProfilPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const initials = me.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 pb-24">
      <main className="flex flex-1 flex-col items-center px-4 pt-12">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-sm">
          <span className="text-[20px] font-bold text-white">{initials}</span>
          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
        </div>

        <h1 className="mb-1 text-[24px] font-bold text-slate-900">{me.full_name}</h1>
        <p className="mb-8 font-mono text-sm text-slate-400">NIP: {me.nip}</p>

        <div className="w-full rounded-2xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Icon name="users" size={22} />
            </div>
            <div>
              <p className="text-[13px] text-slate-400">Peran</p>
              <p className="text-[16px] font-medium text-slate-900">Team Leader / Supervisor</p>
            </div>
          </div>
        </div>

        <form action={logoutAction} className="mt-8 w-full">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-[16px] font-semibold text-rose-600 shadow-sm transition active:scale-[0.98]"
          >
            <Icon name="logout" size={20} />
            Keluar
          </button>
        </form>
      </main>

      <BottomNav active="profil" items={TL_NAV} />
    </div>
  );
}