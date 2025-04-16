"use client";

import { useState, useTransition, useEffect } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { upsertChallengeProgress } from "@/actions/challenge-progress";
import { reduceHearts } from "@/actions/user-progress";
import { MAX_HEARTS } from "@/constants";
import type { UserSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";
import { generatePracticeQuestions, savePracticeHistory } from "@/actions/practice";
import { questionTypeEnum } from "@/db/schema";

import { Challenge } from "./challenge";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";

type QuestionType = typeof questionTypeEnum.enumValues[number];

type WrongQuestion = {
  id: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  type: QuestionType;
  options?: {
    id: number;
    text: string;
    correct: boolean;
  }[];
};

type Challenge = {
  id: number;
  order: number;
  lessonId: number;
  quizId: number;
  type: QuestionType;
  question: string;
  completed: boolean;
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    challengeId: number;
  }[];
  imageUrl?: string;
  audioUrl?: string;
  originalType?: string;
};

type PracticeQuestion = {
  id: number;
  question: string;
  type: QuestionType;
  explanation: string;
  imageUrl?: string;
  audioUrl?: string;
  options: {
    id: number;
    text: string;
    correct: boolean;
  }[];
};

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialQuizId?: number;
  initialLessonChallenges: Challenge[];
  userSubscription: UserSubscription | null;
  userId: string;
  isPracticeMode?: boolean;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialQuizId,
  initialLessonChallenges,
  userSubscription,
  userId,
  isPracticeMode = false,
}: QuizProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const [finishAudio] = useAudio({
    src: "/finish.mp3",
    autoPlay: true,
  });
  const { width, height } = useWindowSize();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [quizId] = useState(initialQuizId || 0);
  const [hearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges, setChallenges] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!challenges || challenges.length === 0) return 0;
    
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });

  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  const [showQuestionsNav, setShowQuestionsNav] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState<string>("");

  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const isLastQuestion = activeIndex === challenges.length - 1;

  // Transform media URLs for current challenge
  const transformedChallenge = challenge ? {
    ...challenge,
    imageUrl: challenge.imageUrl,
    audioUrl: challenge.audioUrl,
  } : null;

  useEffect(() => {
    const answeredCount = Object.keys(userAnswers).length;
    setAllQuestionsAnswered(answeredCount === challenges.length);
  }, [userAnswers, challenges.length]);

  useEffect(() => {
    console.log('Quiz component initialized:', {
      initialQuizId,
      quizId,
      initialLessonId,
      lessonId,
      challengesCount: initialLessonChallenges.length
    });
  }, [initialQuizId, quizId, initialLessonId, lessonId, initialLessonChallenges.length]);

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

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
    setUserAnswers(prev => {
      const newAnswers = {
        ...prev,
        [challenge.id]: id
      };
      
      // Store answers in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('quizUserAnswers', JSON.stringify(newAnswers));
      }

      // Track wrong answers with more details
      const selectedOption = challenge.challengeOptions.find(opt => opt.id === id);
      const correctOption = challenge.challengeOptions.find(opt => opt.correct);
      
      if (selectedOption && correctOption && !selectedOption.correct) {
        const wrongQuestion: WrongQuestion = {
          id: challenge.id.toString(),
          question: challenge.question,
          userAnswer: selectedOption.text,
          correctAnswer: correctOption.text,
          type: challenge.type as QuestionType,
          options: challenge.challengeOptions.map(opt => ({
            id: opt.id,
            text: opt.text,
            correct: opt.correct,
            isSelected: opt.id === id
          }))
        };
        
        setWrongQuestions(prev => {
          // Remove any existing entry for this question
          const filtered = prev.filter(q => q.id !== wrongQuestion.id);
          return [...filtered, wrongQuestion];
        });
      } else {
        // If answer is correct, remove from wrongQuestions if it exists
        setWrongQuestions(prev => prev.filter(q => q.id !== challenge.id.toString()));
      }
      
      return newAnswers;
    });

    // Update progress bar
    const answeredCount = Object.keys({
      ...userAnswers,
      [challenge.id]: id
    }).length;
    const progressPercentage = (answeredCount / challenges.length) * 100;
    setPercentage(progressPercentage);
  };

  const submitQuiz = () => {
    // Đảm bảo lưu trữ câu trả lời khi submit quiz
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizUserAnswers', JSON.stringify(userAnswers));
    }

    const score = challenges.reduce((total, challenge) => {
      const selectedOptionId = userAnswers[challenge.id];
      if (!selectedOptionId) return total;

      const correctOption = challenge.challengeOptions.find(opt => opt.correct);
      if (!correctOption) return total;

      return selectedOptionId === correctOption.id ? total + 1 : total;
    }, 0);

    const finalPercentage = (score / challenges.length) * 100;
    setPercentage(finalPercentage);

    challenges.forEach(challenge => {
      const selectedOptionId = userAnswers[challenge.id];
      const correctOption = challenge.challengeOptions.find(opt => opt.correct);
      
      if (selectedOptionId === correctOption?.id) {
        startTransition(() => {
          upsertChallengeProgress(challenge.id).catch(() => {
            toast.error("Failed to update progress");
          });
        });
      }
    });

    setActiveIndex(challenges.length);
  };

  const transformMediaUrls = (questions: any[]) => {
    return questions.map(q => {
      const transformed = {
        ...q,
        imageUrl: q.imageUrl || q.image_url,
        audioUrl: q.audioUrl || q.audio_url,
      };
      return transformed;
    });
  };

  const fetchQuestions = async (text: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: text,
          multiple_choice_count: 3,
          image_count: 1,
          voice_count: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();
      
      // Transform image and audio URLs for all question types
      const transformedData = {
        ...data,
        multiple_choice_questions: transformMediaUrls(data.multiple_choice_questions || []),
        image_questions: transformMediaUrls(data.image_questions || []),
        voice_questions: transformMediaUrls(data.voice_questions || []),
      };
      
      return transformedData;
    } catch (error) {
      return null;
    }
  };

  const onContinue = () => {
    if (!selectedOption) return;

    if (status === "wrong") {
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (status === "correct") {
      onNext();
      setStatus("none");
      setSelectedOption(undefined);
      return;
    }

    if (isLastQuestion && allQuestionsAnswered) {
      submitQuiz();
      return;
    }

    startTransition(() => {
      const correctOption = options.find((option) => option.correct);
      
      if (!correctOption) return;
      
      if (correctOption.id === selectedOption) {
        setStatus("correct");
        correctControls.play();
      } else {
        setStatus("wrong");
        incorrectControls.play();
      }
    });
  };

  // Cập nhật hàm chuyển đến trang explanations để đảm bảo dữ liệu được lưu
  const goToExplanations = () => {
    // Đảm bảo lưu trữ câu trả lời trước khi chuyển trang
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizUserAnswers', JSON.stringify(userAnswers));
    }
    router.push("/lesson/explanations");
  };

  const startPracticeMode = async () => {
    try {
      // Validate quizId
      if (!quizId) {
        console.error('QuizId is required but not provided');
        toast.error("Cannot start practice mode - missing quiz ID");
        return;
      }

      // Save wrong questions and original prompt to localStorage
      const practiceData = {
        wrongQuestions,
        originalPrompt,
        userId,
        quizId
      };

      console.log('Saving practice data:', practiceData); // Debug log

      localStorage.setItem('practiceData', JSON.stringify(practiceData));
      
      // Save current lesson ID for practice mode
      localStorage.setItem('currentLessonId', lessonId.toString());
      
      // Redirect to practice page
      router.push('/practice');
    } catch (error) {
      console.error("Failed to start practice mode:", error);
      toast.error("Failed to start practice mode");
    }
  };

  if (!challenge) {
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
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
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
            Great job! <br /> You&apos;ve completed the lesson.
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard 
              variant="score" 
              value={{
                correct: Object.entries(userAnswers).reduce((total, [id, selectedId]) => {
                  const question = challenges.find(c => c.id === parseInt(id));
                  const correct = question?.challengeOptions.find(opt => opt.correct);
                  return correct?.id === selectedId ? total + 1 : total;
                }, 0),
                total: challenges.length
              }}
              showPracticeButton={wrongQuestions.length > 0}
              onPractice={startPracticeMode}
            />
            <ResultCard
              variant="hearts"
              value={userSubscription?.isActive ? "∞" : hearts}
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

        <Footer
          lessonId={lessonId}
          quizId={quizId}
          status="completed"
          onCheck={() => router.push("/learn")}
          isPracticeMode={isPracticeMode}
          userId={userId}
          wrongQuestions={wrongQuestions}
          originalPrompt={originalPrompt}
        />
      </>
    );
  }

  const title = challenge.question;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={!!userSubscription?.isActive}
      />
      <div className="flex-1">
        <div className="flex">
          {showQuestionsNav && (
            <div className="w-48 p-4 border-r">
              <div className="grid grid-cols-5 gap-2">
                {challenges.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`aspect-square flex items-center justify-center text-sm font-medium transition-colors
                      ${index === activeIndex 
                        ? 'bg-blue-500 text-white' 
                        : userAnswers[q.id]
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-50 text-gray-400'
                      }
                      hover:bg-blue-400 hover:text-white`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1">
            {challenge && (
              <div className="px-6 pb-28 pt-8">
                <h1 className="text-2xl font-bold text-neutral-700">
                  {title}
                </h1>
                <div className="mt-6">
                  <Challenge
                    id={challenge.id}
                    type={challenge.type}
                    question=""
                    options={options}
                    selectedOption={selectedOption}
                    status={status}
                    onSelect={onSelect}
                    imageUrl={challenge.imageUrl}
                    audioUrl={challenge.audioUrl}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer
        lessonId={lessonId}
        quizId={quizId}
        status={status}
        onCheck={onContinue}
        onBack={activeIndex > 0 ? onBack : undefined}
        onNext={activeIndex < challenges.length - 1 ? onNext : undefined}
        disabled={!selectedOption}
        showNavigationButtons={true}
        isLastQuestion={isLastQuestion}
        allQuestionsAnswered={allQuestionsAnswered}
        isPracticeMode={isPracticeMode}
        userId={userId}
        wrongQuestions={wrongQuestions}
        originalPrompt={originalPrompt || ""}
      />
    </div>
  );
};