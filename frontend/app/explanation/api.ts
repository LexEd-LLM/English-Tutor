import axios from "axios";

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
}

export async function getQuizWithAnswers(quizId: number): Promise<QuizQuestionWithUserAnswer[]> {
  const res = await axios.get(`/api/quiz/${quizId}/explanations`);
  return res.data; // should be an array of questions with user answers and extra info
}

export async function generateExplanation(question: {
  questionId: number;
  questionText: string;
  correctAnswer: string;
  type: string;
  userAnswer: string;
}) {
  const res = await axios.post(
    `/api/quiz/generate-explanation`,
    {
      questionId: question.questionId,
      questionText: question.questionText,
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
  return res.data.explanation;
}

export const calculatePhonemeScore = async (userPhonemes: string, correctPhonemes: string) => {
  const res = await fetch("/api/calculate-phoneme-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPhonemes, correctPhonemes }),
  });

  if (!res.ok) throw new Error("Failed to calculate phoneme score");
  return res.json();
};