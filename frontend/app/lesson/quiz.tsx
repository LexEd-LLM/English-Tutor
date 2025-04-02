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
import { challengeOptions, challenges, userSubscription } from "@/db/schema";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { Challenge } from "./challenge";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";

type Challenge = typeof challenges.$inferSelect & {
  completed: boolean;
  challengeOptions: (typeof challengeOptions.$inferSelect)[];
  imageUrl?: string;
  audioUrl?: string;
};

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  initialLessonChallenges: Challenge[];
  userSubscription:
    | (typeof userSubscription.$inferSelect & {
        isActive: boolean;
      })
    | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  initialLessonChallenges,
  userSubscription,
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
    
    // Giảm hearts khi bắt đầu quiz mới (nếu không phải admin)
    if (!userSubscription?.isActive) {
      setHearts(prev => Math.max(prev - 1, 0));
    }
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
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

  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const isLastQuestion = activeIndex === challenges.length - 1;

  // Transform media URLs for current challenge
  const transformedChallenge = challenge ? {
    ...challenge,
    imageUrl: challenge.imageUrl ? `${BACKEND_URL}${challenge.imageUrl}` : undefined,
    audioUrl: challenge.audioUrl ? `${BACKEND_URL}${challenge.audioUrl}` : undefined,
  } : null;

  useEffect(() => {
    const answeredCount = Object.keys(userAnswers).length;
    setAllQuestionsAnswered(answeredCount === challenges.length);
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

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
    setUserAnswers(prev => ({
      ...prev,
      [challenge.id]: id
    }));

    // Cập nhật thanh trạng thái dựa trên số câu đã trả lời
    const answeredCount = Object.keys({
      ...userAnswers,
      [challenge.id]: id
    }).length;
    const progressPercentage = (answeredCount / challenges.length) * 100;
    setPercentage(progressPercentage);
  };

  const submitQuiz = () => {
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
      console.log('Original question:', q);
      const transformed = {
        ...q,
        imageUrl: q.imageUrl ? `${BACKEND_URL}${q.imageUrl}` : (q.image_url ? `${BACKEND_URL}${q.image_url}` : undefined),
        audioUrl: q.audioUrl ? `${BACKEND_URL}${q.audioUrl}` : (q.audio_url ? `${BACKEND_URL}${q.audio_url}` : undefined),
      };
      console.log('Transformed question:', transformed);
      return transformed;
    });
  };

  const fetchQuestions = async (text: string) => {
    try {
      console.log('Fetching questions from:', `${BACKEND_URL}/api/generate-quiz`);
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
      console.log('Raw response data:', data);
      
      // Transform image and audio URLs for all question types
      const transformedData = {
        ...data,
        multiple_choice_questions: transformMediaUrls(data.multiple_choice_questions || []),
        image_questions: transformMediaUrls(data.image_questions || []),
        voice_questions: transformMediaUrls(data.voice_questions || []),
      };
      
      console.log('Transformed data:', transformedData);
      return transformedData;
    } catch (error) {
      console.error("Error fetching questions:", error);
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
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }
            
            setStatus("correct");
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      } else {
        reduceHearts(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }

            setStatus("wrong");
          })
          .catch(() => toast.error("Something went wrong. Please try again."));
      }
    });
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
            />
            <ResultCard
              variant="hearts"
              value={userSubscription?.isActive ? "∞" : hearts}
              label="Hearts Left"
            />
          </div>

          <div className="flex flex-col gap-y-4 w-full mt-4">
            <Button
              onClick={() => router.push("/lesson/explanations")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3"
            >
              View Explanations
            </Button>
          </div>
        </div>

        <Footer
          lessonId={lessonId}
          status="completed"
          onCheck={() => router.push("/learn")}
        />
      </>
    );
  }

  const title =
    challenge.type === "ASSIST"
      ? "Select the correct meaning"
      : challenge.question;

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
                <Challenge
                  id={challenge.id}
                  type={challenge.type}
                  question={challenge.question}
                  options={options}
                  selectedOption={selectedOption}
                  status={status}
                  onSelect={onSelect}
                  imageUrl={challenge.imageUrl ? `${BACKEND_URL}${challenge.imageUrl}` : undefined}
                  audioUrl={challenge.audioUrl ? `${BACKEND_URL}${challenge.audioUrl}` : undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer
        onCheck={onContinue}
        onBack={activeIndex > 0 ? onBack : undefined}
        onNext={activeIndex < challenges.length - 1 ? onNext : undefined}
        status={status}
        disabled={!selectedOption}
        showNavigationButtons={true}
        isLastQuestion={isLastQuestion}
        allQuestionsAnswered={allQuestionsAnswered}
      />
    </div>
  );
};
