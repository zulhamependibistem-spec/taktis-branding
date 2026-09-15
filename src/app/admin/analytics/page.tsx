import AdminShell from "@/components/admin/AdminShell";
import { AnalyticsManager } from "./AnalyticsManager";

export const metadata = {
  title: "Analytics Selling & Stock - Bistem Jaya Mandiri",
};

export default function AdminAnalyticsPage() {
  return (
    <AdminShell active="analytics">
      <AnalyticsManager />
    </AdminShell>
  );
}
