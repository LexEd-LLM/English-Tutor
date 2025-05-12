"use server";

import { auth } from "@clerk/nextjs";
import { revalidatePath } from "next/cache";

// Generate new quiz questions
export const generateQuiz = async (
  unitIds: number[],
  dokLevel: (1 | 2 | 3)[],
  prompt?: string,
  multipleChoiceCount: number = 3,
  imageCount: number = 1,
  voiceCount: number = 1
): Promise<{ success: boolean; error?: string; quizId?: number}> => {
  try {
    const { userId } = auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log(`Calling API with units: ${unitIds}, prompt: ${prompt}, MC: ${multipleChoiceCount}, Image: ${imageCount}, Voice: ${voiceCount}, dokLevel: ${dokLevel}`);
    
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    const requestBody = {
      user_id: userId,
      unit_ids: unitIds,
      dok_level: dokLevel,
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

    if (!response.ok) {
      const error = await response.text();
      console.error(`Fetch error: ${error}`);
      return { success: false, error };
    }

    try {
      const { quiz_id } = (await response.json()) as { quiz_id: number };
    
      revalidatePath("/learn");
      return {
        success: true,
        quizId: quiz_id,
      };
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      return { success: false, error: "Invalid JSON response from server" };
    }

  } catch (error) {
    console.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
