import { NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ 
      success: false, 
      error: "Invalid login credentials" 
    }, { status: 401 });
  } catch (error) {
    console.error("[ADMIN_AUTH]", error);
    return NextResponse.json({ 
      success: false, 
      error: "An error occurred, please try again" 
    }, { status: 500 });
  }
} 