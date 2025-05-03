const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Generates a practice quiz based on previously wrong answers
 */
export const generatePracticeQuiz = async (
    userId: string,
    quizId: number
): Promise<void> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/practice/generate-again`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                quiz_id: quizId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error generating practice quiz:', errorText);
            throw new Error('Failed to generate practice quiz');
        }

        const data = await response.json();
        const lessonId = data.lesson_id;
        
        // Redirect to lesson page with both quizId and lessonId
        window.location.href = `/lesson?quizId=${quizId}&lessonId=${lessonId}`;
    } catch (error) {
        console.error('Error generating practice quiz:', error);
        throw error;
    }
}; 

// Get user profile
export type Role = "USER" | "VIP" | "ADMIN";

export interface UserProfile {
    id: string;
    name: string;
    imageSrc: string;
    role: Role;
    hearts: number;
    subscriptionStatus: Role;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/user/${userId}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error fetching user profile:", errorText);
            throw new Error("Failed to fetch user profile");
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

export async function getStrengthWeakness(quizId: number) {
  const res = await fetch(`/api/quiz/${quizId}/get-strength-weakness`);
  if (!res.ok) {
    throw new Error("Failed to fetch strengths and weaknesses");
  }
  return res.json();
}
