import { getOutletOptions } from "@/lib/actions/admin";
import AdminShell from "@/components/admin/AdminShell";
import HargaForm from "@/components/admin/HargaForm";

export default async function AdminHargaPage() {
  const res = await getOutletOptions();
  const outlets = res.success ? res.outlets : [];
  const firstOutlet = outlets[0]?.id ?? "";

  return (
    <AdminShell active="harga">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Harga per Outlet</h1>
      </header>
      {outlets.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Belum ada outlet.
        </p>
      ) : (
        <HargaForm outlets={outlets} initialOutletId={firstOutlet} />
      )}
    </AdminShell>
  );
}