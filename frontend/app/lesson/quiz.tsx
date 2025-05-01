"use client";

import { useState, useTransition, useEffect } from "react";

import { useRouter } from "next/navigation";
import { useWindowSize } from "react-use";
import { toast } from "sonner";

import { Challenge } from "./challenge";
import { Footer } from "./footer";
import { Header } from "./header";

import { submitQuizAnswers } from "./api";

type Challenge = {
  id: number;
  quizId: number;
  question: string;
  type: "TEXT" | "IMAGE" | "VOICE" | "PRONUNCIATION";
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    imageSrc?: string | null;
    audioSrc?: string | null;
  }[];
  imageUrl?: string;
  audioUrl?: string;
};

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialActiveSubscription: boolean;
  initialLessonId: number;
  initialQuizId: number;
  initialQuestions: Challenge[];
  userId: string;
};

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialActiveSubscription,
  initialLessonId,
  initialQuizId,
  initialQuestions = [],
  userId,
}: QuizProps) => {
  const router = useRouter();
  
  const [quizId] = useState(initialQuizId);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  
  const [challenges, setChallenges] = useState<Challenge[]>(initialQuestions);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "selected">("none");
  const [userAnswers, setUserAnswers] = useState<Record<number, number | string | {
    userAudioUrl: string;
    userPhonemes: string | null;
  }>>({});
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear previous answers when starting a new quiz
  useEffect(() => {
    localStorage.removeItem('quizUserAnswers');
    setUserAnswers({});
    setSelectedOption(undefined);
    setStatus("none");
  }, [quizId]); // Reset when quiz ID changes

  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const isLastQuestion = activeIndex === challenges.length - 1;

  useEffect(() => {
    const answeredCount = Object.keys(userAnswers).length;
    setAllQuestionsAnswered(answeredCount === challenges.length);
  }, [userAnswers, challenges.length]);
  const onNext = () => {
    if (activeIndex < challenges.length - 1) {
      const nextAnswer = userAnswers[challenges[activeIndex + 1]?.id];
      setActiveIndex((current) => current + 1);
      setSelectedOption(typeof nextAnswer === "number" ? nextAnswer : undefined);
      setStatus("none");
    }
  };
  
  const onBack = () => {
    if (activeIndex > 0) {
      const prevAnswer = userAnswers[challenges[activeIndex - 1]?.id];
      setActiveIndex((current) => current - 1);
      setSelectedOption(typeof prevAnswer === "number" ? prevAnswer : undefined);
      setStatus("none");
    }
  };
  
  const goToQuestion = (index: number) => {
    const answer = userAnswers[challenges[index]?.id];
    setActiveIndex(index);
    setSelectedOption(typeof answer === "number" ? answer : undefined);
    setStatus("none");
  };

  const onSelect = (answer: number | string | { userAudioUrl: string; userPhonemes: string | null }) => {
    if (answer === undefined || answer === null) {
      console.error('Invalid answer:', answer);
      return;
    }

    // For multiple choice, update selectedOption (for UI highlighting)
    if (typeof answer === "number") {
      setSelectedOption(answer);
    }
    // Only None for choosing option many time!!!
    setStatus("none");

    setUserAnswers(prev => {
      const newAnswers = {
        ...prev,
        [challenge.id]: answer
      };

      if (typeof window !== "undefined") {
        localStorage.setItem('quizUserAnswers', JSON.stringify(newAnswers));
      }

      return newAnswers;
    });

    const answeredCount = Object.keys({
      ...userAnswers,
      [challenge.id]: answer
    }).length;
  
    const progressPercentage = (answeredCount / challenges.length) * 100;
    setPercentage(progressPercentage);
  };

  // Add effect to restore answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem('quizUserAnswers');
    if (savedAnswers) {
      try {
        const parsed: Record<number, number | string> = JSON.parse(savedAnswers);
        setUserAnswers(parsed);
  
        const savedAnswer = parsed[challenge?.id];
        if (savedAnswer !== undefined) {
          if (typeof savedAnswer === "number") {
            setSelectedOption(savedAnswer);
          }
          setStatus("selected");
        }
      } catch (e) {
        console.error('Error restoring saved answers:', e);
      }
    }
  }, []);

  const handleSubmitQuiz = async () => {
    if (!allQuestionsAnswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const answers = Object.entries(userAnswers).map(([questionId, answer]) => {
        // Find the question and get the selected option's text
        const question = challenges.find(q => q.id === parseInt(questionId));
        let userAnswer = "";
        let userPhonemes: string | undefined = undefined;

        if (typeof answer === "number") {
          const selectedOption = question?.challengeOptions.find(opt => opt.id === answer);
          userAnswer = selectedOption?.text || "";
        } else if (typeof answer === "string") {
          userAnswer = answer; // e.g. URL to user's audio
        } else if (typeof answer === "object" && "userAudioUrl" in answer) {
          userAnswer = answer.userAudioUrl; // you may also pass phonemes if your backend accepts it
          userPhonemes = answer.userPhonemes ?? undefined;
        }

        return {
          questionId: parseInt(questionId),
          userAnswer,
          ...(userPhonemes ? { userPhonemes } : {})
        };
      });

      const response = await submitQuizAnswers(userId, quizId, answers);
      
      if (response.success) {
        router.push(`/results?quizId=${quizId}`);
      } else {
        toast.error("Failed to submit quiz");
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error("An error occurred while submitting the quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!challenges || challenges.length === 0) {
    return <div>No questions available</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        percentage={percentage}
        hearts={initialHearts}
        hasActiveSubscription={initialActiveSubscription}
        showQuestionsNav={true}
        totalQuestions={challenges.length}
        currentQuestionIndex={activeIndex}
        onQuestionClick={goToQuestion}
      />
      <div className="flex-1">
        <div className="mx-auto h-full max-w-[1140px] px-6 pb-[100px] pt-8 lg:px-10">
          {challenge && (
            <Challenge
              id={challenge.id}
              type={challenge.type}
              question={challenge.question}
              options={challenge.challengeOptions}
              selectedOption={typeof userAnswers[challenge.id] === "number" ? userAnswers[challenge.id] as number : undefined}
              status={status}
              onSelect={onSelect}
              imageUrl={challenge.imageUrl}
              audioUrl={challenge.audioUrl}
              userId={userId}
            />
          )}
        </div>
      </div>
      <Footer
        onBack={activeIndex > 0 ? onBack : undefined}
        onNext={onNext}
        onSubmitQuiz={handleSubmitQuiz}
        showNavigationButtons={true}
        isLastQuestion={isLastQuestion}
        allQuestionsAnswered={allQuestionsAnswered}
      />
    </div>
  );
};