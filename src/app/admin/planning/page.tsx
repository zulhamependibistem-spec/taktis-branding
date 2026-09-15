import AdminShell from "@/components/admin/AdminShell";
import PlanningManager from "@/components/admin/PlanningManager";

export default async function AdminPlanningPage() {
  return (
    <AdminShell active="planning">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Planning</h1>
      </header>
      <PlanningManager />
    </AdminShell>
  );
}