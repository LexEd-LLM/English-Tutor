// frontend/app/api/generate-explanation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import db from '@/db/drizzle';
import { explanations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RequestData {
  question: string;
  correct_answer: string;
  question_type?: string;
  question_id: number;
  user_answer?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("API route generate-explanation called");
    
    // Lấy thông tin người dùng từ auth
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Lấy dữ liệu từ request
    const requestData: RequestData = await request.json();
    console.log("Explanation request data:", requestData);
    
    // Kiểm tra nếu là câu hỏi dạng hình ảnh hoặc âm thanh, từ chối xử lý
    if (requestData.question_type === "IMAGE" || requestData.question_type === "VOICE") {
      console.log("Rejecting explanation request for image or voice question");
      return NextResponse.json(
        { explanation: "Dạng bài này không được hỗ trợ" },
        { status: 200 }
      );
    }
    
    // Gọi đến backend để sinh giải thích
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/generate-explanation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: requestData.question,
        correct_answer: requestData.correct_answer,
        user_answer: requestData.user_answer || requestData.correct_answer,
      }),
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
    const explanationText = data.explanation;
    console.log(`Generated explanation successfully`);
    
    // Lưu explanation vào database
    try {
      // Kiểm tra xem đã có explanation cho câu hỏi này chưa
      const existingExplanation = await db.query.explanations.findFirst({
        where: and(
          eq(explanations.userId, userId),
          eq(explanations.questionId, requestData.question_id)
        ),
      });
      
      if (existingExplanation) {
        // Cập nhật explanation nếu đã tồn tại
        await db.update(explanations)
          .set({
            explanation: explanationText,
            userAnswer: requestData.user_answer,
            correctAnswer: requestData.correct_answer,
            updatedAt: new Date(),
          })
          .where(eq(explanations.id, existingExplanation.id));
      } else {
        // Tạo mới nếu chưa tồn tại
        await db.insert(explanations).values({
          userId,
          questionId: requestData.question_id,
          explanation: explanationText,
          userAnswer: requestData.user_answer,
          correctAnswer: requestData.correct_answer,
        });
      }
      
      console.log("Saved explanation to database");
    } catch (dbError) {
      console.error("Error saving explanation to database:", dbError);
      // Vẫn trả về explanation dù có lỗi khi lưu vào database
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in API route: ${error}`);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}

// API để lấy giải thích đã lưu
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(request.url);
    const questionId = url.searchParams.get("questionId");
    
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }
    
    const savedExplanation = await db.query.explanations.findFirst({
      where: and(
        eq(explanations.userId, userId),
        eq(explanations.questionId, parseInt(questionId))
      ),
    });
    
    if (!savedExplanation) {
      return NextResponse.json(
        { error: "Explanation not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      explanation: savedExplanation.explanation,
      userAnswer: savedExplanation.userAnswer,
      correctAnswer: savedExplanation.correctAnswer,
    });
  } catch (error) {
    console.error(`Error fetching explanation: ${error}`);
    return NextResponse.json(
      { error: "Failed to fetch explanation" },
      { status: 500 }
    );
  }
}