"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Quiz } from "../lesson/quiz";
import { toast } from "sonner";
import { questionTypeEnum } from "@/db/schema";
import type { UserSubscription } from "@/db/schema";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type APIQuizQuestion = {
  id: number;
  type: typeof questionTypeEnum.enumValues[number];
  question: string;
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    imageSrc?: string;
    audioSrc?: string;
  }[];
  imageUrl?: string;
  audioUrl?: string;
  explanation?: string;
};

type APIResponse = {
  multiple_choice_questions: APIQuizQuestion[];
  image_questions: APIQuizQuestion[];
  voice_questions: APIQuizQuestion[];
};

type Challenge = {
  id: number;
  order: number;
  lessonId: number;
  type: typeof questionTypeEnum.enumValues[number];
  originalType?: typeof questionTypeEnum.enumValues[number];
  question: string;
  completed: boolean;
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    challengeId: number;
    imageSrc?: string;
    audioSrc?: string;
  }[];
  imageUrl?: string;
  audioUrl?: string;
};

export default function PracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [lessonId, setLessonId] = useState<number>(1);

  useEffect(() => {
    const initializeUserData = async () => {
      try {
        // Load practice data to get userId
        const practiceDataStr = localStorage.getItem("practiceData");
        if (!practiceDataStr) {
          console.log("No practice data found");
          return;
        }

        const practiceData = JSON.parse(practiceDataStr);
        const { userId } = practiceData;

        // Fetch user progress from API
        const response = await fetch(`${BACKEND_URL}/api/user-progress/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user progress");
        }
        const progress = await response.json();
        setUserProgress(progress);
        
      } catch (error) {
        console.error("Failed to load user progress:", error);
        // Don't show error toast here as we'll use default hearts
      }
    };

    initializeUserData();
  }, []);

  useEffect(() => {
    const initializePractice = async () => {
      console.log("Practice page initialized");
      try {
        // Load practice data from localStorage
        const practiceDataStr = localStorage.getItem("practiceData");
        if (!practiceDataStr) {
          console.log("No practice data found, redirecting to learn page");
          router.push("/learn");
          return;
        }

        const practiceData = JSON.parse(practiceDataStr);
        console.log("Practice data loaded:", practiceData);
        const { wrongQuestions, originalPrompt, userId, quizId } = practiceData;

        if (!wrongQuestions || wrongQuestions.length === 0) {
          console.error("No wrong questions to practice");
          toast.error("No questions to practice");
          router.push("/learn");
          return;
        }

        // Set new lesson ID (increment from the original quiz ID)
        const newLessonId = (quizId || 0) + 1;
        setLessonId(newLessonId);

        // Generate new practice questions
        console.log("Fetching new practice questions...");
        const response = await fetch(`${BACKEND_URL}/api/generate-quiz-again`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            quizId, // Use original quizId for database reference
            wrongQuestions,
            originalPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate practice questions");
        }

        const data = await response.json() as APIResponse;
        console.log("API Response:", data);
        
        // Combine all question types and transform them
        const allQuestions = [
          ...(data.multiple_choice_questions || []),
          ...(data.image_questions || []),
          ...(data.voice_questions || [])
        ];

        // Validate questions array
        if (!allQuestions || !Array.isArray(allQuestions) || allQuestions.length === 0) {
          throw new Error("No questions received from API");
        }

        // Transform questions to match Challenge type
        const transformedQuestions: Challenge[] = allQuestions.map((q, index) => {
          const hasImageUrl = 'imageUrl' in q && q.imageUrl;
          const hasAudioUrl = 'audioUrl' in q && q.audioUrl;
          
          return {
            id: q.id,
            order: index + 1,
            lessonId: newLessonId, // Use new lesson ID for practice session
            type: q.type,
            originalType: q.type,
            question: q.question,
            completed: false,
            imageUrl: hasImageUrl ? q.imageUrl : undefined,
            audioUrl: hasAudioUrl ? q.audioUrl : undefined,
            challengeOptions: q.challengeOptions.map((option) => ({
              id: option.id,
              challengeId: q.id,
              text: option.text,
              correct: option.correct,
              imageSrc: option.imageSrc,
              audioSrc: option.audioSrc,
            })),
          };
        });

        console.log("Transformed questions:", transformedQuestions);
        setChallenges(transformedQuestions);
        
        // Clear practice data from localStorage
        localStorage.removeItem("practiceData");
      } catch (error) {
        console.error("Error in initializePractice:", error);
        toast.error("Failed to load practice questions");
        router.push("/learn");
      } finally {
        setLoading(false);
      }
    };

    initializePractice();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return null;
  }

  // Default to 5 hearts if userProgress is not loaded
  const hearts = userProgress?.hearts ?? 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <Quiz
        initialLessonId={lessonId}
        initialLessonChallenges={challenges}
        initialHearts={hearts}
        initialPercentage={0}
        userSubscription={userSubscription}
        userId={challenges[0]?.id.toString() || ""}
        isPracticeMode={true}
      />
    </div>
  );
} 