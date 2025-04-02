"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserQuizQuestions, setUserQuizQuestions } from "@/db/queries";

// Type definitions
interface ChallengeOption {
  id: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
}

interface BaseQuestion {
  id: number;
  question: string;
  type: string;
  challengeOptions: ChallengeOption[];
  explanation?: string;
}

interface ImageQuestion extends BaseQuestion {
  imageUrl: string;
}

interface VoiceQuestion extends BaseQuestion {
  audioUrl: string;
}

type QuizQuestion = BaseQuestion | ImageQuestion | VoiceQuestion;

interface APIResponse {
  multiple_choice_questions: BaseQuestion[];
  image_questions: ImageQuestion[];
  voice_questions: VoiceQuestion[];
}

// Store quiz questions directly in database
async function storeQuizQuestions(questions: QuizQuestion[]): Promise<boolean> {
  try {
    console.log(`Storing ${questions.length} questions directly to database`);
    const success = await setUserQuizQuestions(questions);
    
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
export const getGeneratedQuiz = async (): Promise<QuizQuestion[]> => {
  try {
    console.log('Getting quiz questions directly from database');
    const questions = await getUserQuizQuestions();
    
    if (questions && Array.isArray(questions)) {
      console.log(`Retrieved ${questions.length} questions directly from database`);
      return questions;
    } else {
      console.warn('No questions found in database via direct call');
      return [];
    }
  } catch (error) {
    console.error('Error retrieving stored questions:', error);
    return [];
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
  prompt: string,
  multipleChoiceCount: number = 6,
  imageCount: number = 2,
  voiceCount: number = 2
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Calling API with prompt: ${prompt}, MC: ${multipleChoiceCount}, Image: ${imageCount}, Voice: ${voiceCount}`);
    
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    console.log(`Using backend URL: ${backendUrl}`);
    
    const requestBody = {
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
    
    // Store questions in database
    const storeSuccess = await storeQuizQuestions(allQuestions);
    if (!storeSuccess) {
      console.warn('Failed to store questions in database');
    }

    revalidatePath("/learn");
    return { success: true };
  } catch (error) {
    console.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}; 