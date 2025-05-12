import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface QuizQuestionWithUserAnswer {
  id: number;
  questionId: number;
  questionText: string;
  type: string;
  options: { text: string }[];
  correctAnswer: string;
  explanation?: string;
  imageUrl?: string;
  audioUrl?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  userPhonemes?: string;
  curriculumTitle?: string;
  quizTitle?: string;
  createdAt?: string;
  visibility?: boolean;
}

export async function getQuizWithAnswers(quizId: number): Promise<QuizQuestionWithUserAnswer[]> {
  const res = await axios.get(`/api/quiz/${quizId}/explanations`);
  return res.data;
}

export async function getStrengthWeakness(quizId: number) {
  const res = await fetch(`/api/quiz/${quizId}/get-strength-weakness`);
  if (!res.ok) {
    throw new Error("Failed to fetch strengths and weaknesses");
  }
  return res.json();
}

export async function generateExplanation(question: {
  questionId: number;
  questionText: string;
  options: { text: string }[];
  correctAnswer: string;
  type: string;
  userAnswer: string;
}): Promise<{ explanation: string; saved: boolean }> {
  const res = await axios.post(
    `/api/quiz/generate-explanation`,
    {
      questionId: question.questionId,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      userAnswer: question.userAnswer,
      type: question.type,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

export interface PhonemeAnalysis {
  score: number;
  highlight: [string, "ok" | "wrong" | "missing"][];
  corrections: string[];
}

export const calculatePhonemeScore = async (
  userPhonemes: string,
  correctPhonemes: string
): Promise<PhonemeAnalysis> => {
  const res = await fetch("/api/calculate-phoneme-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPhonemes, correctPhonemes }),
  });
  if (!res.ok) throw new Error("Failed to calculate phoneme score");
  return res.json();
};

/**
 * Generates a practice quiz based on previously wrong answers
 */
export const generatePracticeQuiz = async (
    userId: string,
    quizId: number
): Promise<void> => {
    try {
        const response = await fetch(`/api/practice/generate-again`, {
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

export async function updateVisibility(quizId: number, visibility: boolean) {
  const res = await fetch(`/api/quiz/${quizId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });

  if (!res.ok) {
    throw new Error("Failed to update visibility");
  }

  return await res.json();
}

export async function updateQuizTitle(quizId: number, newTitle: string) {
  const res = await fetch(`/api/quiz/${quizId}/rename-title`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle }),
  });

  if (!res.ok) {
    throw new Error("Failed to update title");
  }

  return await res.json();
}

export async function deleteQuiz(quizId: number) {
  const res = await fetch(`/api/quiz/${quizId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete quiz");
  }

  return await res.json();
}
