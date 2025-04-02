import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useKey, useMedia } from "react-use";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  onBack?: () => void;
  onNext?: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  showNavigationButtons?: boolean;
  isLastQuestion?: boolean;
  allQuestionsAnswered?: boolean;
};

export const Footer = ({
  onCheck,
  onBack,
  onNext,
  status,
  disabled,
  lessonId,
  showNavigationButtons = false,
  isLastQuestion = false,
  allQuestionsAnswered = false,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const isMobile = useMedia("(max-width: 1024px)");

  return (
    <footer
      className={cn(
        "h-[100px] border-t-2 lg:h-[140px]",
        status === "correct" && "border-transparent bg-green-100",
        status === "wrong" && "border-transparent bg-rose-100"
      )}
    >
      <div className="mx-auto flex h-full max-w-[1140px] items-center justify-between px-6 lg:px-10">
        {status === "correct" && (
          <div className="flex items-center text-base font-bold text-green-500 lg:text-2xl">
            <CheckCircle className="mr-4 h-6 w-6 lg:h-10 lg:w-10" />
            Nicely done!
          </div>
        )}

        {status === "wrong" && (
          <div className="flex items-center text-base font-bold text-rose-500 lg:text-2xl">
            <XCircle className="mr-4 h-6 w-6 lg:h-10 lg:w-10" />
            Try again.
          </div>
        )}

        {status === "completed" && (
          <Button
            variant="default"
            size={isMobile ? "sm" : "lg"}
            onClick={() => (window.location.href = `/lesson/${lessonId}`)}
          >
            Practice again
          </Button>
        )}

        {showNavigationButtons ? (
          <>
            <Button
              onClick={onBack}
              disabled={!onBack}
              size={isMobile ? "sm" : "lg"}
              variant="ghost"
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {isLastQuestion && allQuestionsAnswered ? (
              <Button
                onClick={onCheck}
                disabled={disabled}
                size={isMobile ? "sm" : "lg"}
                variant="secondary"
                className="flex items-center"
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                onClick={onNext || onCheck}
                disabled={(!onNext && !isLastQuestion) || disabled}
                size={isMobile ? "sm" : "lg"}
                variant="primary"
                className="flex items-center"
              >
                {isLastQuestion ? "Check" : "Next"}
                {!isLastQuestion && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            )}
          </>
        ) : (
          <Button
            disabled={disabled}
            aria-disabled={disabled}
            className="ml-auto"
            onClick={onCheck}
            size={isMobile ? "sm" : "lg"}
            variant={status === "wrong" ? "danger" : "secondary"}
          >
            {status === "none" && "Check"}
            {status === "correct" && "Next"}
            {status === "wrong" && "Retry"}
            {status === "completed" && "Continue"}
          </Button>
        )}
      </div>
    </footer>
  );
};
