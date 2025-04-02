"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface RoleSelectorProps {
  userId: string;
  currentRole: string;
}

export const RoleSelector = ({
  userId,
  currentRole,
}: RoleSelectorProps) => {
  const [role, setRole] = useState(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const onRoleChange = async (newRole: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update role");
      }

      setRole(newRole);
      toast.success("Cập nhật role thành công");
    } catch (error) {
      console.error("[ROLE_SELECTOR]", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật role");
      // Khôi phục role cũ nếu có lỗi
      setRole(currentRole);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      value={role}
      onValueChange={onRoleChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[110px]">
        <SelectValue placeholder="Chọn role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">User</SelectItem>
        <SelectItem value="VIP">VIP</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}; 