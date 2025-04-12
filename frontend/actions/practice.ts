const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type PracticeQuestion = {
  id: number;
  question: string;
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    imageSrc?: string;
    audioSrc?: string;
  }[];
  type: string;
  explanation: string;
  imageUrl?: string;
  audioUrl?: string;
};

export type PracticeHistory = {
  userId: string;
  questionId: string;
  isCorrect: boolean;
  answer: string;
  timestamp: Date;
  reviewCount: number;
  nextReview: Date | null;
};

export const generatePracticeQuestions = async (
  userId: string,
  wrongQuestions: string[],
  originalPrompt: string
): Promise<{
  questions: PracticeQuestion[];
  nextReview: Date;
}> => {
  const response = await fetch(`${BACKEND_URL}/api/practice/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      wrong_questions: wrongQuestions,
      original_prompt: originalPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate practice questions");
  }

  const data = await response.json();
  return {
    questions: data.questions,
    nextReview: new Date(data.next_review),
  };
};

export const savePracticeHistory = async (history: PracticeHistory): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}/api/practice/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: history.userId,
      question_id: history.questionId,
      is_correct: history.isCorrect,
      answer: history.answer,
      timestamp: history.timestamp.toISOString(),
      review_count: history.reviewCount,
      next_review: history.nextReview?.toISOString() || null,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save practice history");
  }
}; 