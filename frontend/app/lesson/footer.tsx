import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useKey, useMedia } from "react-use";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FooterProps = {
  onCheck: () => void;
  onBack?: () => void;
  onNext?: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  quizId?: number;
  showNavigationButtons?: boolean;
  isLastQuestion?: boolean;
  allQuestionsAnswered?: boolean;
  userId: string;
  wrongQuestions?: any[];
  originalPrompt?: string;
  isPracticeMode?: boolean;
};

export const Footer = ({
  onCheck,
  onBack,
  onNext,
  status,
  disabled,
  lessonId,
  quizId,
  showNavigationButtons = false,
  isLastQuestion = false,
  allQuestionsAnswered = false,
  userId,
  wrongQuestions = [],
  originalPrompt = "",
  isPracticeMode = false,
}: FooterProps) => {
  useKey("Enter", onCheck, {}, [onCheck]);
  const isMobile = useMedia("(max-width: 1024px)");
  const router = useRouter();

  const handlePracticeAgain = async () => {
    try {
      if (!userId) {
        console.error('UserId is required but not provided');
        return;
      }

      if (!quizId) {
        console.error('QuizId is required but not provided');
        toast.error("Cannot start practice - missing quiz ID");
        return;
      }

      // Debug data being sent
      console.log('[DEBUG] Practice Again - Input Data:', {
        userId,
        quizId,
        wrongQuestionsLength: wrongQuestions?.length,
        originalPrompt
      });

      // Clean up wrong questions data - allow empty array
      const cleanedWrongQuestions = (wrongQuestions || []).map(q => ({
        id: q.id,
        question: q.question,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        type: q.type,
        options: q.options
      }));

      // Save practice data to localStorage with timestamp to force refresh
      const practiceData = {
        wrongQuestions: cleanedWrongQuestions,
        originalPrompt,
        userId,
        quizId,
        timestamp: Date.now()
      };

      console.log('[DEBUG] Saving practice data:', practiceData);
      localStorage.setItem('practiceData', JSON.stringify(practiceData));

      // Force a hard reload when redirecting to practice page
      window.location.href = '/practice';
    } catch (error: any) {
      console.error("[DEBUG] Practice Again - Full Error:", {
        error,
        message: error.message,
        stack: error.stack
      });
      toast.error("Failed to start practice session");
    }
  };

  const handleComplete = async () => {
    try {
      // Call complete practice API
      await fetch(`/api/practice/complete/${userId}`, {
        method: "POST",
      });
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Error completing practice:", error);
    }
  };

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
          <div className="flex gap-4">
            <Button
              variant="default"
              size={isMobile ? "sm" : "lg"}
              onClick={handlePracticeAgain}
            >
              Practice again
            </Button>
          </div>
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
            onClick={status === "completed" ? handleComplete : onCheck}
            size={isMobile ? "sm" : "lg"}
            variant={status === "wrong" ? "danger" : status === "completed" ? "primary" : "secondary"}
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