const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Generates a practice quiz based on previously wrong answers
 */
export const generatePracticeQuiz = async (
    userId: string,
    quizId: number
): Promise<boolean> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/practice/generate-again`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                quizId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error generating practice quiz:', errorText);
            throw new Error('Failed to generate practice quiz');
        }

        return true;
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
