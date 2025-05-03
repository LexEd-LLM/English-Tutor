"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RoleSelector } from "./role-selector";

export type User = {
  id: string;
  name: string;
  imageSrc: string;
  role: "USER" | "VIP" | "ADMIN";
  hearts: number;
  subscriptionStatus: "USER" | "VIP" | "ADMIN";
  subscriptionEndDate: Date | null;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "hearts",
    header: "Hearts",
  },
  {
    accessorKey: "subscriptionStatus",
    header: "Subscription",
  },
  {
    accessorKey: "subscriptionEndDate",
    header: "End Date",
    cell: ({ row }) => {
      const date = row.original.subscriptionEndDate;
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString();
    }
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const userId = row.original.id;
      const currentRole = row.original.role;
      
      return (
        <RoleSelector 
          userId={userId}
          currentRole={currentRole}
        />
      );
    },
  },
]; 