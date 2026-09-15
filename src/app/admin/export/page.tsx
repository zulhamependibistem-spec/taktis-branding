import AdminShell from "@/components/admin/AdminShell";
import ExportManager from "./ExportManager";

export default function AdminExportPage() {
  return (
    <AdminShell active="export">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
      </header>
      <ExportManager />
    </AdminShell>
  );
}