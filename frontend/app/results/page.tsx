"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useWindowSize } from "react-use";
import Confetti from "react-confetti";
import { useAudio } from "react-use";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";
import { Footer } from "./footer";
import { generatePracticeQuiz, getUserProfile, Role, getStrengthWeakness } from "./api";

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
  const [strengths, setStrengths] = useState<string | null>(null);
  const [weaknesses, setWeaknesses] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userHearts, setUserHearts] = useState<number>(5);

  const { width, height } = useWindowSize();
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });

  useEffect(() => {
    const quizResults = localStorage.getItem("quizResults");
    const quizId = searchParams.get("quizId");

    if (quizResults) {
      try {
        const parsedResults = JSON.parse(quizResults);
        setResult(parsedResults);

        // Fetch strengths and weaknesses
        if (parsedResults.quizId) {
          getStrengthWeakness(parsedResults.quizId)
            .then(data => {
              setStrengths(data.strengths);
              setWeaknesses(data.weaknesses);
            })
            .catch(err => {
              console.error("Failed to load strengths/weaknesses:", err);
            });
        }

        if (parsedResults.userId) {
          getUserProfile(parsedResults.userId)
            .then((profile) => {
              setUserRole(profile.role);
              setUserHearts(profile.hearts);
            })
            .catch((err) => {
              console.error("Error loading user profile:", err);
            });
        }
      } catch (e) {
        console.error("Error parsing quiz results:", e);
      }
    } else if (quizId) {
      console.log(`No results found for quiz ${quizId}`);
    }

    setLoading(false);
  }, [searchParams]);

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
    if (result?.quizId) {
      router.push(`/explanation?quizId=${result.quizId}`);
    }
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
        <div className="w-full flex justify-center px-4">
          <h1 className="text-center text-2xl font-extrabold text-blue-600 lg:text-4xl leading-snug">
            🎉 Congratulations on completing the test! 🎉
          </h1>
        </div>
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />
          <p className="text-neutral-600 text-base lg:text-lg text-center max-w-md">
            Review the explanations to reinforce your understanding, or practice again if needed!
          </p>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard 
              variant="score" 
              value={{
                correct: result.correctAnswers,
                total: result.totalQuestions
              }}
            />
            <ResultCard
              variant="hearts"
              value={userRole === "VIP" || userRole === "ADMIN" ? "∞" : userHearts}
              label="Quota Left"
            />
          </div>
          <div className="flex flex-col gap-y-4 w-full mt-4">
            <Button
              onClick={goToExplanations}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
            >
              View Explanation
            </Button>
          </div>
        </div>
        <div className="w-full flex justify-center px-4">
          <div className="w-full max-w-4xl space-y-4">
            {strengths && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md font-medium whitespace-pre-wrap">
                <div className="mb-1">🟢 <strong>Điểm tốt:</strong></div>
                <ReactMarkdown>{strengths}</ReactMarkdown>
              </div>
            )}
            {weaknesses && (
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded-md font-medium whitespace-pre-wrap">
                <div className="mb-1">🔴 <strong>Điểm chưa tốt:</strong></div>
                <ReactMarkdown>{weaknesses}</ReactMarkdown>
              </div>
            )}
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