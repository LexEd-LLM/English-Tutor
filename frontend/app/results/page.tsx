"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWindowSize } from "react-use";
import Confetti from "react-confetti";
import { useAudio } from "react-use";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";
import { Footer } from "./footer";
import { generatePracticeQuiz } from "./api";

interface QuizResult {
  success: boolean;
  totalQuestions: number;
  correctAnswers: number;
  wrongQuestions: number[];
  quizId: number;
  userId: string;
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowSize();
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });

  useEffect(() => {
    // Get results from localStorage
    const quizResults = localStorage.getItem("quizResults");
    
    // Fallback for direct navigation to results page
    const quizId = searchParams.get("quizId");
    
    if (quizResults) {
      try {
        const parsedResults = JSON.parse(quizResults);
        setResult(parsedResults);
      } catch (e) {
        console.error("Error parsing quiz results:", e);
      }
    } else if (quizId) {
      // If the user navigated directly to the results page and we don't have results in localStorage
      // We could fetch results from API here in a real application
      console.log(`No results found for quiz ${quizId}`);
    }
    
    setLoading(false);
  }, [searchParams]);

  const goToExplanations = () => {
    // TODO: Implement explanations view
    console.log("View explanations clicked");
  };

  const handlePracticeAgain = async () => {
    if (!result) return;

    try {
      if (!result.userId) {
        console.error('UserId is required but not provided');
        return;
      }

      if (!result.quizId) {
        console.error('QuizId is required but not provided');
        toast.error("Cannot start practice - missing quiz ID");
        return;
      }

      // Call API to generate practice quiz
      await generatePracticeQuiz(result.userId, result.quizId);
      
      // Force a hard reload when redirecting to practice page
      window.location.href = '/practice';
    } catch (error: any) {
      console.error("[DEBUG] Practice Again - Full Error:", {
        error,
        message: error.message,
        stack: error.stack
      });
      toast.error("Failed to start practice session");
    }
  };

  const handleReturnToLearn = () => {
    router.push("/learn");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading results...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">No Results Found</h1>
        <p>We couldn't find any results for this quiz.</p>
        <Link href="/learn">
          <Button variant="default">Return to Learn</Button>
        </Link>
      </div>
    );
  }

  // Giả định wrongQuestions từ result
  const wrongQuestions = result.wrongQuestions || [];

  return (
    <>
      {finishAudio}
      <Confetti
        recycle={false}
        numberOfPieces={500}
        tweenDuration={10_000}
        width={width}
        height={height}
      />
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 py-10 pb-24">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            Great job! <br /> You&apos;ve completed the quiz.
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard 
              variant="score" 
              value={{
                correct: result.correctAnswers,
                total: result.totalQuestions
              }}
              showPracticeButton={wrongQuestions.length > 0}
              onPractice={handlePracticeAgain}
            />
            <ResultCard
              variant="hearts"
              value={5} // Sample value as requested
              label="Quota Left"
            />
          </div>

          <div className="flex flex-col gap-y-4 w-full mt-4">
            <Button
              onClick={goToExplanations}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
            >
              View Explanations
            </Button>
          </div>
        </div>
      </div>
      <Footer 
        onPracticeAgain={handlePracticeAgain}
        onReturnToLearn={handleReturnToLearn}
        userId={result.userId}
        quizId={result.quizId}
      />
    </>
  );
} 