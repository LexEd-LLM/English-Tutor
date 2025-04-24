"use server";

import { auth } from "@clerk/nextjs";
import { revalidatePath } from "next/cache";

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

// Helper to add quizId
const withQuizIdAndType = <T extends { type: string }>(q: T, quizId: number): T & { quizId: number; } => {
  return {
    ...q,
    quizId,
  };
};

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

    const response = await fetch(`${backendUrl}/api/quiz/generate`, {
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

    const mcQuestions: BaseQuestion[] = data.multiple_choice_questions.map(q => withQuizIdAndType(q, data.quiz_id));
    const imageQuestions: ImageQuestion[] = data.image_questions.map(q => withQuizIdAndType(q, data.quiz_id));
    const voiceQuestions: VoiceQuestion[] = data.voice_questions.map(q => withQuizIdAndType(q, data.quiz_id));
    // const pronunciationQuestions: Không cần xử lí giống 3 dạng câu hỏi trên

    const allQuestions: APIQuizQuestion[] = [...mcQuestions, ...imageQuestions, ...voiceQuestions];

    if (allQuestions.length === 0) {
      console.error("No questions received from backend");
      return {
        success: false,
        error: "No questions generated"
      };
    }

    console.log(`Received total ${allQuestions.length} questions from backend`);
    if (allQuestions.length > 0) {
      console.log(`First question: ${JSON.stringify(allQuestions[0]).substring(0, 2000)}...`);
    }

    revalidatePath("/learn");
    return {
      success: true,
      quizId: data.quiz_id,
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
