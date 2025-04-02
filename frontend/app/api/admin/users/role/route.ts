import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { userProgress } from "@/db/schema";

export async function PATCH(req: Request) {
  try {
    const { userId, role } = await req.json();

    console.log("[ROLE_PATCH] Received request:", { userId, role });

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "UserId không được để trống" 
      }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ 
        success: false, 
        error: "Role không được để trống" 
      }, { status: 400 });
    }

    if (!["USER", "VIP", "ADMIN"].includes(role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Role không hợp lệ" 
      }, { status: 400 });
    }

    // Kiểm tra user tồn tại
    const existingUser = await db.query.userProgress.findFirst({
      where: eq(userProgress.userId, userId),
    });

    if (!existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: "Không tìm thấy user" 
      }, { status: 404 });
    }

    console.log("[ROLE_PATCH] Updating user:", { userId, currentRole: existingUser.role, newRole: role });

    // Cập nhật role cho user
    await db
      .update(userProgress)
      .set({ role })
      .where(eq(userProgress.userId, userId));

    return NextResponse.json({ 
      success: true,
      message: "Cập nhật role thành công"
    });
  } catch (error) {
    console.error("[ROLE_PATCH] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Có lỗi xảy ra khi cập nhật role" 
    }, { status: 500 });
  }
} 