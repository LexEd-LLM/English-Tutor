const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Generates a practice quiz based on previously wrong answers
 */
export const generatePracticeQuiz = async (
    userId: string,
    quizId: number
): Promise<boolean> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-quiz-again`, {
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