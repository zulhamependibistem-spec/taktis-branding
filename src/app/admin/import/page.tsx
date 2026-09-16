import AdminShell from "@/components/admin/AdminShell";
import ImportManager from "./ImportManager";
import { Icon } from "@/components/ui/Icon";

export default function AdminImportPage() {
  return (
    <AdminShell active="import">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import & Sinkronisasi</h1>
        </div>
        <a
          href="/admin/import/template"
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Icon name="download" size={16} />
          Unduh Template Master Outlet
        </a>
      </header>
      <ImportManager />
    </AdminShell>
  );
}