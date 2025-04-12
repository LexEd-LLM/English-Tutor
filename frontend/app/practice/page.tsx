"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quiz } from "../lesson/quiz";
import { QuizQuestion } from "@/types/quiz";

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<{
    questions: QuizQuestion[];
    isPracticeMode: boolean;
    originalPrompt: string;
  } | null>(null);

  useEffect(() => {
    // Load quiz data from localStorage
    const savedQuiz = localStorage.getItem("currentQuiz");
    if (!savedQuiz) {
      router.push("/"); // Redirect to home if no quiz data
      return;
    }

    try {
      const parsedQuiz = JSON.parse(savedQuiz);
      setQuizData(parsedQuiz);
    } catch (error) {
      console.error("Error parsing quiz data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!quizData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Quiz
        questions={quizData.questions}
        isPracticeMode={true}
        originalPrompt={quizData.originalPrompt}
      />
    </div>
  );
} 