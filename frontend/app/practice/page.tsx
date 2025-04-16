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
  quizId: number;
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
  const [quizId, setQuizId] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const initialize = async () => {
      // Check if already initialized in this session
      const initKey = "practice_init_" + Date.now();
      const isAlreadyInitialized = localStorage.getItem(initKey);
      
      if (isAlreadyInitialized) {
        console.log("[DEBUG] Already initialized in this session, skipping");
        return;
      }

      console.log("[DEBUG] Starting initialization");
      try {
        const practiceDataStr = localStorage.getItem("practiceData");
        if (!practiceDataStr || !isSubscribed) {
          console.log("[DEBUG] No practice data found, redirecting to learn page");
          router.push("/learn");
          return;
        }

        // Mark as initialized early to prevent double initialization
        localStorage.setItem(initKey, "true");
        
        const practiceData = JSON.parse(practiceDataStr);
        const { wrongQuestions, originalPrompt, userId, quizId, timestamp } = practiceData;

        console.log("[DEBUG] Practice data loaded:", {
          hasUserId: !!userId,
          hasQuizId: !!quizId,
          wrongQuestionsCount: wrongQuestions?.length,
          timestamp
        });

        // Fetch user progress first
        try {
          const progressResponse = await fetch(`${BACKEND_URL}/api/user-progress/${userId}`);
          if (progressResponse.ok && isSubscribed) {
            const progress = await progressResponse.json();
            setUserProgress(progress);
          }
        } catch (error) {
          console.error("[DEBUG] Failed to load user progress:", error);
          // Continue anyway as we have default hearts
        }

        if (!isSubscribed) return;

        // Set quiz ID
        setQuizId(quizId);

        // Handle lesson ID
        let currentLessonId = parseInt(localStorage.getItem('currentLessonId') || '0');
        if (!currentLessonId || isNaN(currentLessonId)) {
          currentLessonId = 1;
        }
        
        const newLessonId = currentLessonId + 1;
        if (!isSubscribed) return;
        
        setLessonId(newLessonId);
        localStorage.setItem('currentLessonId', newLessonId.toString());
        console.log("[DEBUG] New lesson ID:", newLessonId);

        // Generate practice questions
        console.log("[DEBUG] Fetching practice questions...");
        const response = await fetch(`${BACKEND_URL}/api/generate-quiz-again`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            quizId,
            wrongQuestions: wrongQuestions || [],
            originalPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate practice questions");
        }

        const data = await response.json() as APIResponse;
        console.log("[DEBUG] API Response received");
        
        if (!isSubscribed) return;

        const allQuestions = [
          ...(data.multiple_choice_questions || []),
          ...(data.image_questions || []),
          ...(data.voice_questions || [])
        ];

        if (!allQuestions || !Array.isArray(allQuestions) || allQuestions.length === 0) {
          throw new Error("No questions received from API");
        }

        const transformedQuestions: Challenge[] = allQuestions.map((q, index) => ({
          id: q.id,
          order: index + 1,
          lessonId: newLessonId,
          quizId: quizId,
          type: q.type,
          originalType: q.type,
          question: q.question,
          completed: false,
          imageUrl: 'imageUrl' in q && q.imageUrl ? q.imageUrl : undefined,
          audioUrl: 'audioUrl' in q && q.audioUrl ? q.audioUrl : undefined,
          challengeOptions: q.challengeOptions.map((option) => ({
            id: option.id,
            challengeId: q.id,
            text: option.text,
            correct: option.correct,
            imageSrc: option.imageSrc,
            audioSrc: option.audioSrc,
          })),
        }));

        if (!isSubscribed) return;
        console.log("[DEBUG] Setting challenges");
        setChallenges(transformedQuestions);
        
        // Mark as initialized before clearing localStorage
        setIsInitialized(true);
        
        // Clear both practice data and init flag after successful setup
        console.log("[DEBUG] Clearing practice data from localStorage");
        localStorage.removeItem("practiceData");
        localStorage.removeItem(initKey);
        console.log("[DEBUG] Practice data cleared");
        
      } catch (error) {
        // Clear init flag on error
        localStorage.removeItem(initKey);
        console.error("[DEBUG] Error in initialization:", error);
        if (isSubscribed) {
          toast.error("Failed to load practice questions");
          router.push("/learn");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isSubscribed = false;
    };
  }, [router, isInitialized]); // Keep isInitialized in dependencies

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
        initialQuizId={quizId}
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