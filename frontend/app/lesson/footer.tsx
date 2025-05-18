import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useKey, useMedia } from "react-use";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type FooterProps = {
  onBack?: () => void;
  onNext?: () => void;
  onSubmitQuiz?: () => Promise<void>;
  showNavigationButtons?: boolean;
  isLastQuestion?: boolean;
  allQuestionsAnswered?: boolean;
};

export const Footer = ({
  onBack,
  onNext,
  onSubmitQuiz,
  showNavigationButtons = false,
  isLastQuestion = false,
  allQuestionsAnswered = false,
}: FooterProps) => {
  const isMobile = useMedia("(max-width: 1024px)");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useKey("Enter", onNext, {}, [onNext]);
  useKey("ArrowLeft", () => {
    if (onBack) onBack();
  }, {}, [onBack]);
  useKey("ArrowRight", () => {
    if (onNext) onNext();
  }, {}, [onNext]);

  const showSubmitButton = allQuestionsAnswered || isLastQuestion;

  const handleSubmit = async () => {
    if (!onSubmitQuiz) return;
    setIsSubmitting(true);
    try {
      await onSubmitQuiz();
    } finally {
      setIsSubmitting(false); // Optional if navigation happens after submit
    }
  };

  return (
    <>
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
        </div>
      )}
      <footer className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-lg">
        <div className="mx-auto flex w-full max-w-[1140px] items-center justify-between">
          <div className="flex items-center gap-x-4">
            {showNavigationButtons && (
              <Button
                onClick={onBack}
                size={isMobile ? "sm" : "lg"}
                variant="ghost"
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {!isMobile && "Back"}
              </Button>
            )}
          </div>
          {showSubmitButton ? (
            <Button
              onClick={handleSubmit}
              size={isMobile ? "sm" : "lg"}
              variant="secondary"
              className="min-w-[120px]"
              disabled={isSubmitting}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={onNext}
              size={isMobile ? "sm" : "lg"}
              variant="secondary"
              className="min-w-[120px]"
              disabled={isSubmitting}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </>
  );
};
