import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import { getReportFormData, getReportStatus } from "@/lib/actions/sales";
import { dateWIBLabel } from "@/lib/date";
import SalesForm from "./SalesForm";

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: Promise<{ re?: string }>;
}) {
  const today = dateWIBLabel(new Date(), { day: "numeric", month: "short", year: "numeric" });
  void searchParams;

  const [data, status] = await Promise.all([getReportFormData(), getReportStatus()]);
  if (!data.success) redirect("/spg");

  if (status.salesDone && !status.stockDone) redirect("/spg/stock");
  if (status.salesDone && status.stockDone) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
        <header className="sticky top-0 z-nav flex items-center gap-2 border-b border-slate-200/60 bg-white px-4 py-3">
          <Link
            href="/spg"
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 active:scale-95"
          >
            <Icon name="chevronRight" size={22} className="rotate-180" />
          </Link>
          <h1 className="text-[20px] font-semibold text-slate-900">Laporan Sales</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="check" size={32} />
          </span>
          <h2 className="text-[18px] font-bold text-slate-900">
            Laporan hari ini sudah terkirim
          </h2>
          <p className="text-sm text-slate-500">
            Sales dan stok untuk {today} sudah dilaporkan. Silakan lanjut ke hari berikutnya.
          </p>
          <Link
            href="/spg/riwayat"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Lihat Riwayat
          </Link>
        </main>
        <BottomNav active="sales" items={SPG_NAV} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-nav flex items-center gap-2 border-b border-slate-200/60 bg-white px-4 py-3">
        <Link
          href="/spg"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 active:scale-95"
        >
          <Icon name="chevronRight" size={22} className="rotate-180" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900">Laporan Sales</h1>
          <p className="text-sm text-slate-500">{today}</p>
        </div>
      </header>

      <SalesForm items={data.items} />

      <BottomNav active="sales" items={SPG_NAV} />
    </div>
  );
}