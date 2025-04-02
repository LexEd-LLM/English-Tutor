import { DataTable } from "./data-table";
import { columns } from "./columns";
import { getUsersWithRoles } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Lấy danh sách users
  const users = await getUsersWithRoles();

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>
      <div className="mt-8">
        <DataTable columns={columns} data={users} />
      </div>
    </div>
  );
} 