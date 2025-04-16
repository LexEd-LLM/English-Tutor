"use server";

import { auth } from "@clerk/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserQuizQuestions, setUserQuizQuestions } from "@/db/queries";

import db from "@/db/drizzle";
import { updateUserCurriculumProgress } from "@/db/queries";
import { userQuizzes, userUnitProgress, type QuizQuestion as DBQuizQuestion } from "@/db/schema";

// Type definitions for API response
interface ChallengeOption {
  id: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
}

interface BaseQuestion {
  id: number;
  quizId: number;
  question: string;
  type: "FILL_IN_BLANK" | "TRANSLATION" | "IMAGE" | "VOICE";
  challengeOptions: ChallengeOption[];
  explanation?: string;
}

interface ImageQuestion extends BaseQuestion {
  imageUrl: string;
}

interface VoiceQuestion extends BaseQuestion {
  audioUrl: string;
}

type APIQuizQuestion = BaseQuestion | ImageQuestion | VoiceQuestion;

interface APIResponse {
  multiple_choice_questions: BaseQuestion[];
  image_questions: ImageQuestion[];
  voice_questions: VoiceQuestion[];
}

// Store quiz questions directly in database
async function storeQuizQuestions(
  questions: APIQuizQuestion[], 
  quizId: number,  // Add quizId parameter
  unitId?: number, 
  prompt?: string
): Promise<boolean> {
  try {
    console.log(`Storing ${questions.length} questions for quiz ${quizId}`);
    
    // Add quizId to each question
    const questionsWithQuizId = questions.map(q => ({
      ...q,
      quizId: quizId
    }));
    
    const success = await setUserQuizQuestions(questionsWithQuizId, unitId, prompt);
    
    if (success) {
      console.log('Successfully stored questions in database');
      return true;
    } else {
      console.warn('Failed to store questions in database via direct call');
      return false;
    }
  } catch (error) {
    console.error('Failed to store quiz questions:', error);
    return false;
  }
}

// Get stored quiz questions
export const getGeneratedQuiz = async (): Promise<{ questions: APIQuizQuestion[]; quizId: number }> => {
  try {
    console.log('Getting quiz questions directly from database');
    const questions = await getUserQuizQuestions();
    
    if (questions && Array.isArray(questions)) {
      console.log(`Retrieved ${questions.length} questions directly from database`);
      
      // Get quizId from first question or default to 0
      const quizId = questions[0]?.quizId;
      if (!quizId) {
        console.error('No quizId found in questions:', questions);
        throw new Error('No quizId found in questions');
      }

      // Convert DB questions to API format
      const apiQuestions = questions.map(q => ({
        id: q.id,
        quizId: q.quizId, // Add quizId from database
        question: q.questionText,
        type: q.type,
        challengeOptions: q.options as ChallengeOption[],
        explanation: q.explanation || undefined,
        ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
        ...(q.audioUrl ? { audioUrl: q.audioUrl } : {}),
      })) as APIQuizQuestion[];
      
      // Log first question for debugging
      console.log('First question with quizId:', {
        questionId: apiQuestions[0]?.id,
        quizId,
        totalQuestions: apiQuestions.length
      });
      
      return {
        questions: apiQuestions,
        quizId
      };
    } else {
      console.warn('No questions found in database via direct call');
      throw new Error('No questions found in database');
    }
  } catch (error) {
    console.error('Error retrieving stored questions:', error);
    throw error;
  }
};

// Clear stored quiz questions
export const clearGeneratedQuiz = async () => {
  try {
    console.log('Clearing quiz questions directly from database');
    await setUserQuizQuestions([]);
    console.log('Successfully cleared questions from database');
  } catch (error) {
    console.warn('Failed to clear quiz storage:', error);
  }
};

// Generate new quiz questions
export const generateQuiz = async (
  unitIds: number[],
  prompt?: string,
  multipleChoiceCount: number = 3,
  imageCount: number = 1,
  voiceCount: number = 1
): Promise<{ success: boolean; error?: string; quizId?: number }> => {
  try {
    // First create the quiz to get the quizId
    const quizResult = await createQuizForUnit(unitIds[0], prompt || "");
    if (!quizResult.success || !quizResult.quizId) {
      throw new Error("Failed to create quiz");
    }
    const quizId = quizResult.quizId;
    console.log(`Created quiz with ID: ${quizId}`);

    console.log(`Calling API with units: ${unitIds}, prompt: ${prompt}, MC: ${multipleChoiceCount}, Image: ${imageCount}, Voice: ${voiceCount}`);
    
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    console.log(`Using backend URL: ${backendUrl}`);
    
    const requestBody = {
      unit_ids: unitIds,
      prompt,
      multiple_choice_count: multipleChoiceCount,
      image_count: imageCount,
      voice_count: voiceCount,
    };
    console.log(`Request body: ${JSON.stringify(requestBody)}`);
    
    const response = await fetch(`${backendUrl}/api/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Fetch error: ${error}`);
      return { success: false, error };
    }

    const responseText = await response.text();
    console.log(`Raw response: ${responseText.substring(0, 200)}...`);
    
    let data: APIResponse;
    try {
      data = JSON.parse(responseText) as APIResponse;
    } catch (e) {
      console.error(`Failed to parse JSON response: ${e}`);
      return {
        success: false,
        error: "Invalid JSON response from server"
      };
    }
    
    console.log(`Parsed response data keys: ${Object.keys(data).join(', ')}`);
    
    // Combine all question types into a single array
    const allQuestions = [
      ...data.multiple_choice_questions,
      ...data.image_questions,
      ...data.voice_questions
    ];
    
    if (allQuestions.length === 0) {
      console.error("No questions received from backend");
      return { 
        success: false, 
        error: "No questions generated" 
      };
    }
    
    console.log(`Received total ${allQuestions.length} questions from backend`);
    if (allQuestions.length > 0) {
      console.log(`First question: ${JSON.stringify(allQuestions[0]).substring(0, 200)}...`);
    }
    
    // Store questions in database with quizId
    const storeSuccess = await storeQuizQuestions(allQuestions, quizId, unitIds[0], prompt);
    if (!storeSuccess) {
      console.warn('Failed to store questions in database');
    }

    revalidatePath("/learn");
    return { success: true, quizId }; // Return quizId
  } catch (error) {
    console.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export async function createQuizForUnit(unitId: number, prompt: string) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    // Create the quiz
    const [quiz] = await db
      .insert(userQuizzes)
      .values({
        userId,
        unitId,
        prompt,
      })
      .returning();

    if (!quiz) {
      throw new Error("Failed to create quiz");
    }

    // Mark unit as completed
    const [progress] = await db
      .insert(userUnitProgress)
      .values({
        userId,
        unitId,
      })
      .returning();

    if (!progress) {
      throw new Error("Failed to update unit progress");
    }

    // Get the curriculum ID for this unit
    const unit = await db.query.units.findFirst({
      where: (units, { eq }) => eq(units.id, unitId),
    });

    if (!unit) {
      throw new Error("Unit not found");
    }

    // Update curriculum progress
    await updateUserCurriculumProgress(userId, unit.curriculumId);

    // Fix revalidatePath warnings by adding 'page' argument
    revalidatePath("/learn", 'page');
    revalidatePath("/unit/[id]", 'page');

    return { success: true, quizId: quiz.id };
  } catch (error) {
    console.error("[QUIZ_CREATION]", error);
    return { success: false, error: "Failed to create quiz" };
  }
} 