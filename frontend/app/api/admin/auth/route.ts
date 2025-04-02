import { NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MAnH12345";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ 
      success: false, 
      error: "Thông tin đăng nhập không chính xác" 
    }, { status: 401 });
  } catch (error) {
    console.error("[ADMIN_AUTH]", error);
    return NextResponse.json({ 
      success: false, 
      error: "Có lỗi xảy ra, vui lòng thử lại" 
    }, { status: 500 });
  }
} 