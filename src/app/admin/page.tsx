import Link from "next/link";
import type { ComponentProps } from "react";
import { getSessionUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/actions/admin";
import { dateWIBLabel } from "@/lib/date";
import AdminShell from "@/components/admin/AdminShell";
import LiveClock from "@/components/ui/LiveClock";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type IconName = ComponentProps<typeof Icon>["name"];

type AksiItem = { id: string; nama: string; nip: string | null; outlet: string; tl: string };

function formatRp(v: number) {
  return "Rp " + v.toLocaleString("id-ID");
}

function AksiList({
  icon,
  title,
  count,
  items,
  href,
  emptyText,
  emptyHref,
}: {
  icon: IconName;
  title: string;
  count: number;
  items: AksiItem[];
  href: string;
  emptyText: string;
  emptyHref: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon name={icon} size={16} />
          </span>
          {title}
        </h3>
        {count > 0 && (
          <Link href={href} className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">
            Lihat semua ({count})
            <Icon name="chevronRight" size={13} />
          </Link>
        )}
      </div>
      {count === 0 ? (
        <Link
          href={emptyHref}
          className="flex items-center gap-2 px-4 py-6 text-[13px] font-medium text-emerald-600 transition hover:bg-emerald-50/50"
        >
          <Icon name="check" size={16} />
          {emptyText}
        </Link>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{r.nama}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {r.outlet}
                  {r.tl && r.tl !== "-" ? ` · ${r.tl}` : ""}
                </p>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{r.nip ?? "-"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AdminDashboard() {
  const me = await getSessionUser();
  const date = dateWIBLabel(new Date(), { dateStyle: "full" });

  const res = await getAdminStats();
  const d = res.success
    ? res
    : {
        date: "",
        absen: { hadir: 0, total: 0 },
        lapor: { jumlah: 0, total: 0 },
        omzet: { nilai: 0, target: 0 },
        perluAksi: {
          belumAbsen: [] as AksiItem[],
          belumAbsenTotal: 0,
          belumLapor: [] as AksiItem[],
          belumLaporTotal: 0,
          tanpaOutlet: [] as AksiItem[],
          tanpaOutletTotal: 0,
          tanpaTl: [] as AksiItem[],
          tanpaTlTotal: 0,
        },
      };

  const pctOmzet = d.omzet.target > 0 ? Math.round((d.omzet.nilai / d.omzet.target) * 100) : 0;
  const aksiTotal =
    d.perluAksi.belumAbsenTotal + d.perluAksi.belumLaporTotal + d.perluAksi.tanpaOutletTotal + d.perluAksi.tanpaTlTotal;

  const cards = [
    {
      label: "SPG Absen Hari Ini",
      value: `${d.absen.hadir} / ${d.absen.total}`,
      sub: d.absen.total > 0 && d.absen.hadir >= d.absen.total ? "Semua sudah check-in" : `${d.absen.total - d.absen.hadir} belum check-in`,
      icon: "schedule" as const,
      cls: d.absen.total > 0 && d.absen.hadir >= d.absen.total ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
    },
    {
      label: "SPG Lapor Hari Ini",
      value: `${d.lapor.jumlah} / ${d.lapor.total}`,
      sub: d.lapor.total > 0 && d.lapor.jumlah >= d.lapor.total ? "Semua sudah lapor" : `${d.lapor.total - d.lapor.jumlah} belum lapor`,
      icon: "assignment" as const,
      cls: d.lapor.total > 0 && d.lapor.jumlah >= d.lapor.total ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
    },
    {
      label: "Omzet Hari Ini vs Target",
      value: formatRp(d.omzet.nilai),
      sub: `${pctOmzet}% dari ${formatRp(d.omzet.target)}`,
      icon: "analytics" as const,
      cls: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Perlu Aksi",
      value: String(aksiTotal),
      sub: aksiTotal === 0 ? "Semua bersih" : "cek daftar di bawah",
      icon: "warning" as const,
      cls: aksiTotal === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <AdminShell active="dashboard">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Selamat datang, {me?.full_name} · <LiveClock />
          </p>
        </div>
        <p className="text-[13px] font-semibold text-slate-500">{date}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-[12px] font-semibold text-slate-500">{c.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{c.value}</p>
              <p className={cn("mt-1 text-[11px] font-medium", aksiTotal === 0 && c.label === "Perlu Aksi" ? "text-emerald-600" : "text-slate-400")}>
                {c.sub}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.cls}`}>
              <Icon name={c.icon} size={20} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-bold text-slate-900">Perlu Aksi</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AksiList
          icon="schedule"
          title="Belum Absen Hari Ini"
          count={d.perluAksi.belumAbsenTotal}
          items={d.perluAksi.belumAbsen}
          href="/admin/attendance"
          emptyText="Semua SPG sudah check-in"
          emptyHref="/admin/attendance"
        />
        <AksiList
          icon="assignment"
          title="Belum Lapor Sales / Stock"
          count={d.perluAksi.belumLaporTotal}
          items={d.perluAksi.belumLapor}
          href="/admin/attendance"
          emptyText="Semua SPG sudah lapor"
          emptyHref="/admin/attendance"
        />
        <AksiList
          icon="store"
          title="SPG Tanpa Outlet"
          count={d.perluAksi.tanpaOutletTotal}
          items={d.perluAksi.tanpaOutlet}
          href="/admin/users"
          emptyText="Semua SPG punya outlet"
          emptyHref="/admin/users"
        />
        <AksiList
          icon="users"
          title="SPG Tanpa Supervisor"
          count={d.perluAksi.tanpaTlTotal}
          items={d.perluAksi.tanpaTl}
          href="/admin/users"
          emptyText="Semua SPG sudah memiliki supervisor"
          emptyHref="/admin/users"
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-slate-400">© Projo Cabang Klender</p>
    </AdminShell>
  );
}