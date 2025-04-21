import { ArrowLeft, ArrowRight } from "lucide-react";
import { useKey, useMedia } from "react-use";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type FooterProps = {
  onCheck: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmitQuiz?: () => void;
  status: "none" | "selected";
  disabled?: boolean;
  lessonId?: number;
  quizId?: number;
  showNavigationButtons?: boolean;
  isLastQuestion?: boolean;
  allQuestionsAnswered?: boolean;
  userId: string;
  wrongQuestions?: any[];
};

export const Footer = ({
  onCheck,
  onBack,
  onNext,
  onSubmitQuiz,
  quizId,
  showNavigationButtons = false,
  isLastQuestion = false,
  allQuestionsAnswered = false,
  userId,
  wrongQuestions = [],
}: FooterProps) => {
  const isMobile = useMedia("(max-width: 768px)");

  useKey("Enter", onNext, {}, [onNext]);
  useKey("ArrowLeft", () => {
    if (onBack) onBack();
  }, {}, [onBack]);
  useKey("ArrowRight", () => {
    if (onNext) onNext();
  }, {}, [onNext]);

  const showSubmitButton = allQuestionsAnswered || isLastQuestion;

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-lg">
      <div className="mx-auto flex w-full max-w-[1140px] items-center justify-between">
        <div className="flex items-center gap-x-4">
          {showNavigationButtons && (
            <Button
              onClick={onBack}
              size={isMobile ? "sm" : "lg"}
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {!isMobile && "Back"}
            </Button>
          )}
        </div>
        {showSubmitButton ? (
          <Button
            onClick={onSubmitQuiz}
            size={isMobile ? "sm" : "lg"}
            variant="secondary"
            className="min-w-[120px]"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={onNext}
            size={isMobile ? "sm" : "lg"}
            variant="secondary"
            className="min-w-[120px]"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </footer>
  );
};