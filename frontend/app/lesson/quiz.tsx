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
  type: "FILL_IN_BLANK" | "TRANSLATION" | "PRONUNCIATION" | "VOICE" | "IMAGE";
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
  initialLessonId: number;
  initialQuizId: number;
  initialQuestions: Challenge[];
  userId: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialQuizId,
  initialQuestions = [],
  userId,
}: QuizProps) => {
  const { width, height } = useWindowSize();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  
  const [lessonId] = useState(initialLessonId);
  const [quizId] = useState(initialQuizId);
  const [hearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  
  const [challenges, setChallenges] = useState<Challenge[]>(initialQuestions);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "selected">("none");
  const [showQuestionsNav] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
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
    
    // Debug log for answers status
    console.log('Debug - Answer Status:', {
      totalQuestions: challenges.length,
      answeredCount,
      userAnswers,
      isAllAnswered: answeredCount === challenges.length
    });
  }, [userAnswers, challenges.length]);

  const onNext = () => {
    if (activeIndex < challenges.length - 1) {
      setActiveIndex((current) => current + 1);
      setSelectedOption(userAnswers[challenges[activeIndex + 1]?.id]);
      setStatus("none");
    }
  };

  const onBack = () => {
    if (activeIndex > 0) {
      setActiveIndex((current) => current - 1);
      setSelectedOption(userAnswers[challenges[activeIndex - 1]?.id]);
      setStatus("none");
    }
  };

  const goToQuestion = (index: number) => {
    setActiveIndex(index);
    setSelectedOption(userAnswers[challenges[index]?.id]);
    setStatus("none");
  };

  const onSelect = (optionId: number) => {
    // Validate optionId before setting
    if (optionId === undefined) {
      console.error('Invalid option id:', optionId);
      return;
    }

    console.log('Debug - Selected Option:', {
      questionType: challenge.type,
      selectedOptionId: optionId,
      questionId: challenge.id,
      allOptions: options
    });

    // Always allow selecting a new option
    setSelectedOption(optionId);
    setStatus("none");
    
    setUserAnswers(prev => {
      const newAnswers = {
        ...prev,
        [challenge.id]: optionId
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('quizUserAnswers', JSON.stringify(newAnswers));
      }
     
      return newAnswers;
    });

    const answeredCount = Object.keys({
      ...userAnswers,
      [challenge.id]: optionId
    }).length;
    const progressPercentage = (answeredCount / challenges.length) * 100;
    setPercentage(progressPercentage);
  };

  // Add effect to restore answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem('quizUserAnswers');
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setUserAnswers(parsed);
        
        // If there's an answer for current question, select it
        if (challenge && parsed[challenge.id]) {
          setSelectedOption(parsed[challenge.id]);
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
      const answers = Object.entries(userAnswers).map(([questionId, answerId]) => {
        // Find the question and get the selected option's text
        const question = challenges.find(q => q.id === parseInt(questionId));
        const selectedOption = question?.challengeOptions.find(opt => opt.id === answerId);
        
        return {
          questionId: parseInt(questionId),
          userAnswer: selectedOption?.text || ""
        };
      });

      // Debug log submission data
      console.log('Debug - Submission Data:', {
        userId,
        quizId,
        answers
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
        showQuestionsNav={true}
        totalQuestions={challenges.length}
        currentQuestionIndex={activeIndex}
        onQuestionClick={goToQuestion}
      />
      <div className="flex-1">
        <div className="mx-auto h-full max-w-[1140px] px-6 pb-[100px] pt-8 lg:px-10">
          {challenge && (
            <Challenge
              key={challenge.id}
              id={challenge.id}
              type={challenge.type}
              question={challenge.question}
              options={challenge.challengeOptions}
              selectedOption={selectedOption}
              status={status}
              onSelect={onSelect}
              imageUrl={challenge.imageUrl}
              audioUrl={challenge.audioUrl}
            />
          )}
        </div>
      </div>
      <Footer
        onCheck={isLastQuestion ? handleSubmitQuiz : onNext}
        onBack={activeIndex > 0 ? onBack : undefined}
        onNext={onNext}
        onSubmitQuiz={handleSubmitQuiz}
        status={status}
        quizId={quizId}
        showNavigationButtons={true}
        isLastQuestion={isLastQuestion}
        allQuestionsAnswered={allQuestionsAnswered}
        userId={userId}
      />
    </div>
  );
};