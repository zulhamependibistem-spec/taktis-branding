import AdminShell from "@/components/admin/AdminShell";
import ImportManager from "./ImportManager";

export default function AdminImportPage() {
  return (
    <AdminShell active="import">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import & Sinkronisasi</h1>
        </div>
      </header>
      <ImportManager />
    </AdminShell>
  );
}