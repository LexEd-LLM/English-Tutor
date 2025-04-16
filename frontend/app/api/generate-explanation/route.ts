import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import db from '@/db/drizzle';
import { quizQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
        question_id: requestData.question_id,
        question: requestData.question,
        correct_answer: requestData.correct_answer,
        question_type: requestData.question_type,
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
      // Cập nhật explanation trong bảng quizQuestions
      const result = await db
        .update(quizQuestions)
        .set({
          explanation: explanationText,
        })
        .where(eq(quizQuestions.id, requestData.question_id))
        .returning({ explanation: quizQuestions.explanation });

      if (!result || result.length === 0) {
        throw new Error("Failed to update explanation in database");
      }
      
      console.log("Saved explanation to database");
      
      // Trả về kết quả với trạng thái đã lưu
      return NextResponse.json({
        explanation: explanationText,
        saved: true
      });
    } catch (dbError) {
      console.error("Error saving explanation to database:", dbError);
      // Trả về explanation với trạng thái chưa lưu được
      return NextResponse.json({
        explanation: explanationText,
        saved: false,
        error: "Failed to save explanation"
      });
    }
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
    
    const question = await db
      .select({
        explanation: quizQuestions.explanation,
        questionText: quizQuestions.questionText,
        correctAnswer: quizQuestions.correctAnswer,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.id, parseInt(questionId)))
      .limit(1);
    
    if (!question || question.length === 0) {
      return NextResponse.json(
        { error: "Explanation not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      explanation: question[0].explanation || "No explanation available",
      question: question[0].questionText,
      correctAnswer: question[0].correctAnswer,
      saved: true
    });
  } catch (error) {
    console.error(`Error fetching explanation: ${error}`);
    return NextResponse.json(
      { error: "Failed to fetch explanation" },
      { status: 500 }
    );
  }
}