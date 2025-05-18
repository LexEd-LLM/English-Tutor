import { useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderNavButtons = () => (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: totalQuestions }).map((_, index) => {
        const questionId = questions[index]?.id;
        const isAnswered = questionId != null && userAnswers[questionId] !== undefined;
        const isActive = index === currentQuestionIndex;

        return (
          <button
            key={index}
            onClick={() => {
              onQuestionClick?.(index);
              setMobileNavOpen(false);
            }}
            className={`h-8 w-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${
              isActive
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
  );

  return (
    <div className="relative">
      {/* Mobile toggle button */}
      {showQuestionsNav && totalQuestions > 0 && (
        <button
          onClick={() => setMobileNavOpen(true)}
          className="xl:hidden fixed left-4 bottom-[80px] z-30 p-2 bg-white rounded-full shadow-md text-gray-500 hover:opacity-75"
        >
          &gt;
        </button>
      )}

      {/* Desktop sidebar nav */}
      {showQuestionsNav && totalQuestions > 0 && (
        <div className="hidden xl:flex fixed left-4 top-[150px] flex-col gap-2 p-4 rounded-md z-20">
          {renderNavButtons()}
        </div>
      )}

      {/* Mobile sliding nav panel */}
      {mobileNavOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-400 bg-opacity-50 z-40"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Nav panel */}
          <div
            className={`
              fixed left-0 bottom-0 
              w-64 max-w-[80%]              
              h-1/2  
              z-50 p-4
              transform ${mobileNavOpen ? "translate-y-0" : "translate-y-full"}
              transition-transform duration-300 ease-in-out
              xl:hidden
            `}
          >
            <div className="flex justify-end">
              <X
                onClick={() => setMobileNavOpen(false)}
                className="cursor-pointer text-gray-500 hover:opacity-75"
              />
            </div>

            {/* Scrollable index list */}
            <div 
              className="mt-4 overflow-y-auto max-h-[calc(50vh-80px)]"
            >
              {renderNavButtons()}
            </div>
          </div>
        </>
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
            src={hasActiveSubscription ? "/unlimited_heart.svg" : "/heart.svg"}
            alt="Heart"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          {hasActiveSubscription ? (
            <InfinityIcon className="h-6 w-6 shrink-0 stroke-[3] text-[#26f663]" />
          ) : (
            <span className="text-rose-500 font-bold">{hearts}</span>
          )}
        </div>
      </header>
    </div>
  );
};
