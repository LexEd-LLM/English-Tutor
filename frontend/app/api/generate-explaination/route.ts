// frontend/app/api/generate-explanation/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface RequestData {
  question: string;
  correct_answer: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("API route generate-explanation called");
    
    // Lấy dữ liệu từ request
    const requestData: RequestData = await request.json();
    console.log("Explanation request data:", requestData);
    
    // Gọi đến backend để sinh giải thích
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/generate-explanation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to generate explanation: ${error}`);
      return NextResponse.json(
        { error: "Failed to generate explanation" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`Generated explanation successfully`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in API route: ${error}`);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}