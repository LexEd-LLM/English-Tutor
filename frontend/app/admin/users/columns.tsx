"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RoleSelector } from "./role-selector";

export type User = {
  id: string;
  email: string;
  imageUrl: string;
  role: "USER" | "VIP" | "ADMIN";
  points: number;
  hearts: number;
  createdAt: Date;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "points",
    header: "Points",
  },
  {
    accessorKey: "hearts",
    header: "Hearts",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const userId = row.original.id;
      const currentRole = row.original.role;
      
      console.log("Role selector data:", { userId, currentRole });
      
      return (
        <RoleSelector 
          userId={userId}
          currentRole={currentRole}
        />
      );
    },
  },
]; 