import { getUsers } from "@/lib/actions/admin";
import AdminShell from "@/components/admin/AdminShell";
import UsersManager from "./UsersManager";

export default async function AdminUsersPage() {
  const res = await getUsers();
  const list = res.success ? res.list : [];
  const error = res.success ? null : res.error;

  return (
    <AdminShell active="users">
      <UsersManager initial={list} loadError={error} />
    </AdminShell>
  );
}
