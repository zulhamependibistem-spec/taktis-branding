import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import { timeWIB } from "@/lib/date";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function RiwayatPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const supabase = createServerClient();
  const { data } = await supabase
    .from("attendance")
    .select(
      "id, report_date, check_in_time, check_out_time, check_in_photo_url, check_out_photo_url, status"
    )
    .eq("user_id", me.id)
    .order("report_date", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as {
    id: string;
    report_date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_photo_url: string | null;
    check_out_photo_url: string | null;
    status: string;
  }[];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-nav bg-slate-50/90 px-4 pb-3 pt-12 backdrop-blur-md">
        <h1 className="text-[24px] font-bold text-slate-900">Riwayat Absensi</h1>
        <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
          {rows.length} catatan terakhir
        </p>
      </header>

      <main className="flex flex-col gap-2 p-4">
        {rows.length === 0 && (
          <p className="pt-16 text-center text-sm text-slate-400">
            Belum ada catatan absensi.
          </p>
        )}

        {rows.map((r) => {
          const hasPhoto = r.check_in_photo_url || r.check_out_photo_url;
          return (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900">{fmtDate(r.report_date)}</p>
                <StatusPill status={r.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Icon name="logout" size={12} /> Check-in
                  </p>
                  <p className="mt-0.5 font-mono text-[15px] font-bold text-slate-800">
                    {r.check_in_time ? timeWIB(r.check_in_time) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <Icon name="logout" size={12} className="rotate-180" /> Check-out
                  </p>
                  <p className="mt-0.5 font-mono text-[15px] font-bold text-slate-800">
                    {r.check_out_time ? timeWIB(r.check_out_time) : "—"}
                  </p>
                </div>
              </div>
              {hasPhoto && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Icon name="camera" size={12} /> Foto verifikasi Admin
                </p>
              )}
            </div>
          );
        })}
      </main>

      <BottomNav active="riwayat" items={SPG_NAV} />
    </div>
  );
}