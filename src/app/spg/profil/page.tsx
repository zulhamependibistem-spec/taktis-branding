import { redirect } from "next/navigation";
import { getSessionUser, logoutService } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import AvatarUpload from "./AvatarUpload";

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function ProfilPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const supabase = createServerClient();
  const { data } = await supabase
    .from("users")
    .select("full_name, nip, supervisor_id, area, avatar_url")
    .eq("id", me.id)
    .maybeSingle();

  const prof = data as unknown as {
    full_name: string;
    nip: string;
    supervisor_id: string | null;
    area: string | null;
    avatar_url: string | null;
  } | null;

  let supervisorName: string | null = null;
  if (prof?.supervisor_id) {
    const { data: s } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", prof.supervisor_id)
      .maybeSingle();
    supervisorName = s?.full_name ?? null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 pb-24">
      <main className="flex flex-1 flex-col items-center px-4 pt-12">
        {/* Avatar */}
        <div className="mb-3">
          <AvatarUpload avatarUrl={prof?.avatar_url ?? null} name={prof?.full_name ?? me.full_name} />
        </div>

        {/* Info */}
        <h1 className="mb-1 text-[24px] font-bold text-slate-900">{prof?.full_name}</h1>
        <p className="mb-1 font-mono text-sm text-slate-500">NIP: {prof?.nip}</p>
        {prof?.area && (
          <div className="mb-8 inline-flex items-center gap-1 rounded-full bg-indigo-600/10 px-3 py-1">
            <Icon name="storefront" size={14} className="text-indigo-600" />
            <span className="text-[12px] font-bold text-indigo-600">{prof.area}</span>
          </div>
        )}

        {/* Info Tambahan */}
        <div className="w-full rounded-2xl border border-white/50 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-indigo-600">
              <Icon name="person" size={22} />
            </div>
            <div>
              <p className="text-[13px] text-slate-500">Admin / Supervisor</p>
              <p className="text-[16px] font-medium text-slate-900">
                {supervisorName ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
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

      <BottomNav active="profil" items={SPG_NAV} />
    </div>
  );
}