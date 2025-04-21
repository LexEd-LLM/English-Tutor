import { ArrowLeft, ArrowRight } from "lucide-react";
import { useKey, useMedia } from "react-use";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lessonApi } from "./api";

type FooterProps = {
  onCheck: () => void;
  onBack?: () => void;
  onNext?: () => void;
  status: "none" | "selected";
  disabled?: boolean;
  lessonId?: number;
  quizId?: number;
  showNavigationButtons?: boolean;
  isLastQuestion?: boolean;
  allQuestionsAnswered?: boolean;
  userId: string;
  wrongQuestions?: any[];
  isPracticeMode?: boolean;
};

export const Footer = ({
  onCheck,
  onBack,
  onNext,
  quizId,
  showNavigationButtons = false,
  isLastQuestion = false,
  allQuestionsAnswered = false,
  userId,
  wrongQuestions = [],
}: FooterProps) => {
  const router = useRouter();
  const isMobile = useMedia("(max-width: 768px)");

  useKey("Enter", onNext, {}, [onNext]);
  useKey("ArrowLeft", () => {
    if (onBack) onBack();
  }, {}, [onBack]);
  useKey("ArrowRight", () => {
    if (onNext) onNext();
  }, {}, [onNext]);

  const handleSubmitQuiz = async () => {
    try {
      // Call onCheck to validate final answer if needed
      onCheck();
      
      // Navigate to results page with quiz ID
      if (quizId) {
        router.push(`/results?quizId=${quizId}`);
      } else {
        toast.error("Quiz ID is missing");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    }
  };

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
            onClick={handleSubmitQuiz}
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