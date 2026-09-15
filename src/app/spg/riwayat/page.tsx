import BottomNav from "@/components/ui/BottomNav";
import { SPG_NAV } from "@/components/ui/nav";
import { getSalesHistory } from "@/lib/actions/sales";
import { getStockHistory } from "@/lib/actions/stock";
import RiwayatList from "./RiwayatList";

export default async function RiwayatPage() {
  const [salesRes, stockRes] = await Promise.all([getSalesHistory(), getStockHistory()]);
  const sales = salesRes.success
    ? (salesRes.reports as unknown as {
        id: string;
        report_date: string;
        qty_sold: number;
        sampling_qty: number;
        total_selling: number;
        status: string;
        ec: number | null;
        product: { variant: string } | null;
        outlet: { name: string } | null;
      }[])
    : [];
  const stock = stockRes.success
    ? (stockRes.reports as unknown as {
        id: string;
        report_date: string;
        stock_awal: number;
        stock_akhir: number;
        selisih: number;
        status: string;
        product: { variant: string } | null;
        outlet: { name: string } | null;
      }[])
    : [];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-nav bg-slate-50/90 px-4 pb-3 pt-12 backdrop-blur-md">
        <h1 className="text-[24px] font-bold text-slate-900">Riwayat Laporan</h1>
      </header>

      <RiwayatList sales={sales} stock={stock} />

      <BottomNav active="riwayat" items={SPG_NAV} />
    </div>
  );
}
