import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getUserQuizQuestions, setUserQuizQuestions } from '@/db/queries';

// GET để lấy câu hỏi đã lưu
export async function GET() {
  console.log(`[QUIZ STORAGE API] GET Request received`);
  
  try {
    // Lấy ID người dùng
    const { userId } = auth();
    console.log(`[QUIZ STORAGE API] User ID: ${userId || 'not authenticated'}`);
    
    if (!userId) {
      console.log(`[QUIZ STORAGE API] User not authenticated, returning empty questions`);
      return NextResponse.json({ questions: [] });
    }
    
    // Lấy câu hỏi từ database
    const questions = await getUserQuizQuestions();
    
    if (questions && Array.isArray(questions)) {
      console.log(`[QUIZ STORAGE API] Retrieved ${questions.length} questions for user ${userId}`);
      
      if (questions.length > 0) {
        console.log(`[QUIZ STORAGE API] Sample question: ${JSON.stringify(questions[0]).substring(0, 100)}...`);
      }
      
      return NextResponse.json({ questions });
    } else {
      console.log(`[QUIZ STORAGE API] No questions found in database for user ${userId}`);
      return NextResponse.json({ questions: [] });
    }
  } catch (error) {
    console.error(`[QUIZ STORAGE API] Error retrieving questions: ${error}`);
    return NextResponse.json(
      { error: "Failed to retrieve questions" },
      { status: 500 }
    );
  }
}

// POST để lưu câu hỏi mới
export async function POST(request: NextRequest) {
  console.log(`[QUIZ STORAGE API] POST Request received`);
  
  try {
    // Lấy ID người dùng
    const { userId } = auth();
    console.log(`[QUIZ STORAGE API] User ID: ${userId || 'not authenticated'}`);
    
    if (!userId) {
      console.error("[QUIZ STORAGE API] User not authenticated");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    if (!data.questions || !Array.isArray(data.questions)) {
      console.error("[QUIZ STORAGE API] Invalid data format for storing questions");
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }
    
    // Lưu câu hỏi vào database
    const success = await setUserQuizQuestions(data.questions);
    
    if (!success) {
      console.error("[QUIZ STORAGE API] Failed to store questions in database");
      return NextResponse.json(
        { error: "Failed to store questions" },
        { status: 500 }
      );
    }
    
    console.log(`[QUIZ STORAGE API] Stored ${data.questions.length} questions for user ${userId}`);
    
    if (data.questions.length > 0) {
      console.log(`[QUIZ STORAGE API] Sample first question: ${JSON.stringify(data.questions[0]).substring(0, 100)}...`);
    }
    
    return NextResponse.json({ 
      success: true, 
      count: data.questions.length 
    });
  } catch (error) {
    console.error(`[QUIZ STORAGE API] Error storing quiz questions: ${error}`);
    return NextResponse.json(
      { error: "Failed to store questions" },
      { status: 500 }
    );
  }
} 