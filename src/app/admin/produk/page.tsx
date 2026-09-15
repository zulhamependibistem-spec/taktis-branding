import { getProducts } from "@/lib/actions/admin";
import AdminShell from "@/components/admin/AdminShell";
import ProdukManager from "./ProdukManager";

export default async function AdminProdukPage() {
  const res = await getProducts();
  const list = res.success ? res.list : [];
  const error = res.success ? null : res.error;

  return (
    <AdminShell active="produk">
      <ProdukManager initial={list} loadError={error} />
    </AdminShell>
  );
}
