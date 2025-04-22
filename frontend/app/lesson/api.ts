const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface QuizAnswer {
    questionId: number;
    userAnswer: string;
}

export interface QuizSubmissionResponse {
    success: boolean;
    totalQuestions?: number;
    correctAnswers?: number;
    quizId?: number;
}

export interface QuizData {
    multiple_choice_questions: QuizQuestion[];
    image_questions: QuizQuestion[];
    voice_questions: QuizQuestion[];
    pronunc_questions: QuizQuestion[];
}

export interface QuizQuestion {
    id: number;
    question: string;
    type: "FILL_IN_BLANK" | "TRANSLATION" | "IMAGE" | "VOICE" | "PRONUNCIATION";
    challengeOptions: QuizOption[];
    explanation?: string;
    imageUrl?: string;
    audioUrl?: string;
    correctAnswer?: string;
}

export interface QuizOption {
    id: number;
    text: string;
    correct: boolean;
    imageSrc?: string | null;
    audioSrc?: string | null;
}

// Function to submit quiz answers to backend
export const submitQuizAnswers = async (
    userId: string, 
    quizId: number, 
    answers: QuizAnswer[]
): Promise<QuizSubmissionResponse> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/submit-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                quizId,
                answers,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error submitting quiz:', errorText);
            throw new Error('Failed to submit quiz answers');
        }

        const result = await response.json();
        
        // Store results in localStorage for retrieval in results page
        if (result.success && typeof window !== 'undefined') {
            const resultWithUserId = {
                ...result,
                userId, // thêm userId vào dữ liệu lưu trữ
            };
            localStorage.setItem('quizResults', JSON.stringify(resultWithUserId));
        }
        
        return result;
    } catch (error) {
        console.error('Error submitting quiz answers:', error);
        throw error;
    }
};

export const lessonApi = {
    async submitQuizAnswers(userId: string, lessonId: number, answers: QuizAnswer[]): Promise<QuizSubmissionResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/quiz/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    lessonId,
                    answers,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit quiz answers');
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting quiz answers:', error);
            throw error;
        }
    },


    async fetchQuizById(quizId: number): Promise<QuizData> {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/quiz/${quizId}`, {
            cache: "no-store",
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch quiz: ${errorText}`);
        }

        return response.json();
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