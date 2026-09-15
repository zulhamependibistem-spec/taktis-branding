import { getTeamOutletOptions } from "@/lib/actions/tl";
import HargaForm from "@/components/admin/HargaForm";
import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";

export default async function TlHargaPage() {
  const res = await getTeamOutletOptions();
  const outlets = res.success ? res.outlets : [];
  const firstOutlet = outlets[0]?.id ?? "";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 pb-24 pt-10 md:max-w-5xl">
      <h1 className="mb-1 text-[24px] font-bold text-slate-900">Harga Outlet</h1>
      {outlets.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Belum ada outlet binaan. Hubungi admin jika ini salah.
        </p>
      ) : (
        <HargaForm outlets={outlets} initialOutletId={firstOutlet} />
      )}

      <BottomNav active="harga" items={TL_NAV} />
    </div>
  );
}