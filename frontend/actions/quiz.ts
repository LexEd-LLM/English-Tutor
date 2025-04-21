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
  quiz_id: number;
  multiple_choice_questions: BaseQuestion[];
  image_questions: ImageQuestion[];
  voice_questions: VoiceQuestion[];
}

// Generate new quiz questions
export const generateQuiz = async (
  unitIds: number[],
  prompt?: string,
  multipleChoiceCount: number = 3,
  imageCount: number = 1,
  voiceCount: number = 1
): Promise<{ success: boolean; error?: string; quizId?: number; questions?: APIQuizQuestion[] }> => {
  try {
    const { userId } = auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log(`Calling API with units: ${unitIds}, prompt: ${prompt}, MC: ${multipleChoiceCount}, Image: ${imageCount}, Voice: ${voiceCount}`);
    
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    const requestBody = {
      user_id: userId,
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
    console.log(`Raw response: ${responseText.substring(0, 2000)}...`);
    
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
    
    // Combine all question types into a single array and add quizId
    const allQuestions = [
      ...data.multiple_choice_questions,
      ...data.image_questions,
      ...data.voice_questions
    ].map(q => ({
      ...q,
      quizId: data.quiz_id // Use quiz_id from response
    }));
    
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

    revalidatePath("/learn");
    return { 
      success: true, 
      quizId: data.quiz_id, // Use quiz_id from response
      questions: allQuestions 
    };
  } catch (error) {
    console.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};