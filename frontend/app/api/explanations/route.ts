import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { quizQuestions } from "@/db/schema";

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const questionId = url.searchParams.get("questionId");

    if (!questionId) {
      return new NextResponse("Question ID is required", { status: 400 });
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
      return new NextResponse("Question not found", { status: 404 });
    }

    return NextResponse.json({
      explanation: question[0].explanation || "No explanation available",
      question: question[0].questionText,
      correctAnswer: question[0].correctAnswer,
    });
  } catch (error) {
    console.error("[EXPLANATIONS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 