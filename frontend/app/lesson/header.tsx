import { InfinityIcon, X } from "lucide-react";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { useExitModal } from "@/store/use-exit-modal";

type HeaderProps = {
  hearts: number;
  percentage: number;
  hasActiveSubscription?: boolean;
  showQuestionsNav?: boolean;
  totalQuestions?: number;
  currentQuestionIndex?: number;
  onQuestionClick?: (index: number) => void;
  userAnswers?: Record<number, any>;
  questions?: { id: number }[];
};

export const Header = ({
  hearts,
  percentage,
  hasActiveSubscription = false,
  showQuestionsNav = false,
  totalQuestions = 0,
  currentQuestionIndex = 0,
  onQuestionClick,
  userAnswers = {},
  questions = [],
}: HeaderProps) => {
  const { open } = useExitModal();

  return (
    <div className="relative">
      {/* Left sidebar for question navigation */}
      {showQuestionsNav && totalQuestions > 0 && (
        <div className="fixed left-4 top-[150px] flex flex-col gap-2 p-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }).map((_, index) => {
              const questionId = questions[index]?.id;
              const isAnswered = questionId && userAnswers[questionId] !== undefined;
              
              return (
                <button
                  key={index}
                  onClick={() => onQuestionClick?.(index)}
                  className={`h-8 w-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${
                    index === currentQuestionIndex
                      ? "border-2 border-black text-gray-700"
                      : isAnswered
                      ? "border-blue-500 text-gray-700 bg-blue-50"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  } bg-white`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main header */}
      <header className="mx-auto flex w-full max-w-[1140px] items-center justify-between gap-x-7 px-10 pt-[20px] lg:pt-[50px]">
        <X
          onClick={open}
          className="cursor-pointer text-slate-500 transition hover:opacity-75"
        />

        <Progress value={percentage} />

        <div className="flex items-center font-bold text-rose-500">
          <Image
            src="/heart.svg"
            height={28}
            width={28}
            alt="Heart"
            className="mr-2"
          />
          {hasActiveSubscription ? (
            <InfinityIcon className="h-6 w-6 shrink-0 stroke-[3]" />
          ) : (
            hearts
          )}
        </div>
      </header>
    </div>
  );
};