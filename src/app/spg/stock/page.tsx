import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import { getStockFormData } from "@/lib/actions/stock";
import StockForm from "./StockForm";

export default async function StockPage() {
  const data = await getStockFormData();
  if (!data.success) redirect("/spg");

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-nav flex items-center gap-2 border-b border-slate-200/60 bg-white px-4 py-3">
        <Link
          href="/spg"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 active:scale-95"
        >
          <Icon name="chevronRight" size={22} className="rotate-180" />
        </Link>
        <h1 className="text-[20px] font-semibold text-slate-900">Laporan Stok</h1>
      </header>

      <StockForm items={data.items} sold={data.sold} />

      <BottomNav active="sales" items={SPG_NAV} />
    </div>
  );
}
