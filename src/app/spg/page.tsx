import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, logoutService } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getSalesHistory } from "@/lib/actions/sales";
import { getStockHistory } from "@/lib/actions/stock";
import Logo from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import StatusPill from "@/components/ui/StatusPill";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import CheckInReminder from "@/components/spg/CheckInReminder";
import { todayWIB, dateWIBLabel } from "@/lib/date";
import { TARGET_SPG_PER_DAY } from "@/lib/target";

function fmtRp(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function SpgHome() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const supabase = createServerClient();
  const [outletRes, meRes] = await Promise.all([
    me.assigned_outlet_id
      ? supabase.from("outlets").select("name").eq("id", me.assigned_outlet_id).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("users").select("avatar_url").eq("id", me.id).limit(1).maybeSingle(),
  ]);
  const outletName = (outletRes.data as { name?: string } | null)?.name ?? "-";

  const today = dateWIBLabel(new Date(), { weekday: "short", day: "numeric", month: "short" });

  const todayISO = todayWIB();

  const [salesRes, stockRes, attRes] = await Promise.all([
    getSalesHistory(),
    getStockHistory(),
    supabase
      .from("attendance")
      .select("check_in_time, check_out_time, check_in_photo_url, status")
      .eq("user_id", me.id)
      .eq("report_date", todayISO)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const attData = attRes.data as { check_in_time: string | null; check_out_time: string | null; check_in_photo_url: string | null } | null;
  const isCheckedIn = !!attData?.check_in_time;
  const isCheckedOut = !!attData?.check_out_time;

  let avatar = (meRes.data as { avatar_url: string | null } | null)?.avatar_url ?? null;

  // Fallback: Use SPG's real selfie check-in photo if custom profile avatar is not uploaded
  if (!avatar && attData?.check_in_photo_url) {
    const rawPhoto = attData.check_in_photo_url;
    if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
      avatar = rawPhoto;
    } else {
      const { data: pubData } = supabase.storage.from("attendance-photos").getPublicUrl(rawPhoto);
      if (pubData?.publicUrl) avatar = pubData.publicUrl;
    }
  }

  const salesToday = salesRes.success
    ? salesRes.reports.find((r) => r.report_date === todayISO)
    : undefined;
  const stockToday = stockRes.success
    ? stockRes.reports.find((r) => r.report_date === todayISO)
    : undefined;
  const salesStatus = salesToday ? salesToday.status : "not_submitted";
  const stockStatus = stockToday ? stockToday.status : "not_submitted";

  const todayRows = salesRes.success
    ? salesRes.reports.filter((r) => r.report_date === todayISO)
    : [];
  const omzetToday = todayRows.reduce((sum, r) => sum + (r.total_selling || 0), 0);
  const qtyToday = todayRows.reduce((sum, r) => sum + (r.qty_sold || 0), 0);
  const ecToday = todayRows.reduce((max, r) => Math.max(max, r.ec ?? 0), 0);
  const pct = Math.min(100, Math.round((omzetToday / TARGET_SPG_PER_DAY) * 100));
  const isDone = pct >= 100;

  return (
    <div className="mx-auto min-h-screen max-w-md pb-4">
      {/* Header */}
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Logo imgHeight={30} />
          <div className="flex items-center gap-2">
            <Link
              href="/spg/profil"
              aria-label="Profil"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-600 text-base font-bold text-white transition hover:opacity-90 active:scale-95"
            >
              {avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="woman" size={20} filled />
              )}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Keluar"
                title="Keluar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Icon name="logout" size={19} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-4 p-4">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-indigo-700 p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-white/75">Halo, selamat bekerja</p>
              <h1 className="mt-0.5 truncate text-[22px] font-bold leading-tight">{me.full_name}</h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
                  <Icon name="store" size={13} />
                  {outletName}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
                  <Icon name="calendar" size={13} />
                  {today}
                </span>
              </div>
            </div>
            <Link
              href="/spg/profil"
              className="group relative flex h-24 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-white/40 bg-white/10 p-1 shadow-xl backdrop-blur-md transition active:scale-95"
            >
              {avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatar}
                  alt={me.full_name}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-700 shadow-md">
                    <Icon name="woman" size={30} filled />
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-white/90">Profil</span>
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-2 ring-white">
                <Icon name="camera" size={12} />
              </div>
            </Link>
          </div>
        </section>

        {/* Direct Check-In Hero Action Card */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isCheckedIn ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}>
                <Icon name="camera" size={22} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  {isCheckedOut ? "Absen Selesai" : isCheckedIn ? "Sudah Check-In" : "Belum Check-In"}
                </h2>
                <p className="text-[12px] text-slate-500">
                  {isCheckedOut
                    ? "Check-out terrekam hari ini."
                    : isCheckedIn
                      ? "Siap input laporan sales & stok."
                      : "Foto selfie & lokasi GPS wajib."}
                </p>
              </div>
            </div>

            <Link
              href="/spg/absen"
              className={`flex h-11 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white shadow-sm transition active:scale-95 ${
                isCheckedOut
                  ? "bg-slate-700 hover:bg-slate-800"
                  : isCheckedIn
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700 animate-pulse"
              }`}
            >
              <span>{isCheckedOut ? "Detail" : isCheckedIn ? "Check-Out" : "Check-In"}</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>
        </section>

        {/* Pencapaian Hari Ini */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
                <Icon name="analytics" size={17} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Pencapaian Hari Ini</h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Target omzet {fmtRp(TARGET_SPG_PER_DAY)} / hari
                </p>
              </div>
            </div>
            <span className="mt-1 font-mono text-[15px] font-bold text-slate-900">
              {fmtRp(omzetToday)}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                isDone ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-[11px] font-bold ${isDone ? "text-emerald-600" : "text-indigo-600"}`}>
              {isDone ? "Target tercapai" : `${pct}% dari target`}
            </span>
            <span className="flex gap-2 text-[11px] font-semibold text-slate-500">
              <span>{qtyToday} pcs terjual</span>
              <span className="text-slate-300">·</span>
              <span>EC {ecToday}</span>
            </span>
          </div>
        </section>

        {/* Laporan Hari Ini */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
              <Icon name="analytics" size={17} />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900">Laporan Hari Ini</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/spg/sales"
              className="group flex flex-col rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98]"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <Icon name="edit" size={18} className="text-indigo-600" />
                <StatusPill status={salesStatus} />
              </div>
              <span className="text-[15px] font-bold text-slate-900">Sales</span>
              <span className="mt-0.5 text-[11px] font-medium text-slate-400">
                Input laporan penjualan
              </span>
            </Link>
            <Link
              href="/spg/stock"
              className="group flex flex-col rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98]"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <Icon name="store" size={18} className="text-indigo-600" />
                <StatusPill status={stockStatus} />
              </div>
              <span className="text-[15px] font-bold text-slate-900">Stok</span>
              <span className="mt-0.5 text-[11px] font-medium text-slate-400">
                Input laporan stok 4 SKU
              </span>
            </Link>
          </div>
        </section>

        {/* Menu Lainnya */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {[
            { href: "/spg/absen", icon: "camera", label: "Absen" },
            { href: "/spg/riwayat", icon: "history", label: "Riwayat Laporan" },
            { href: "/spg/profil", icon: "person", label: "Profil" },
          ].map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition last:border-0 hover:bg-slate-50 active:bg-slate-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-indigo-600">
                <Icon name={m.icon as "camera"} size={18} />
              </span>
              <span className="flex-1 text-[14px] font-semibold text-slate-800">{m.label}</span>
              <Icon name="chevronRight" size={18} className="text-slate-300" />
            </Link>
          ))}
        </section>

        <p className="text-center text-[11px] text-slate-400">
          TAKTIS Branding · PT Bistem Jaya Mandiri
        </p>
      </main>

      <BottomNav active="home" items={SPG_NAV} />
      <CheckInReminder isCheckedIn={isCheckedIn} />
    </div>
  );
}