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

  const handlePracticeAgain = async () => {
    try {
      // Debug data being sent
      console.log('Practice Again - Input Data:', {
        userId,
        wrongQuestionsLength: wrongQuestions?.length,
        wrongQuestions,
        originalPrompt
      });

      // 1. Save practice history
      const historyResponse = await fetch("/api/practice/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          wrongQuestions,
          originalPrompt
        }),
      });

      if (!historyResponse.ok) {
        const errorData = await historyResponse.json();
        console.error('Practice History API Error:', {
          status: historyResponse.status,
          statusText: historyResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to save practice history: ${JSON.stringify(errorData)}`);
      }

      console.log('Practice history saved successfully');

      // 2. Generate new quiz based on history
      const quizResponse = await fetch("/api/generate-quiz-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          wrongQuestions,
          originalPrompt,
        }),
      });

      if (!quizResponse.ok) {
        const errorData = await quizResponse.json();
        console.error('Generate Quiz API Error:', {
          status: quizResponse.status,
          statusText: quizResponse.statusText,
          error: errorData
        });
        throw new Error(`Failed to generate new quiz: ${JSON.stringify(errorData)}`);
      }

      const quizData = await quizResponse.json();
      console.log('New quiz generated successfully:', quizData);

      // Save quiz data to localStorage for the new lesson
      localStorage.setItem('currentQuiz', JSON.stringify({
        questions: [
          ...quizData.multiple_choice_questions || [],
          ...quizData.image_questions || [],
          ...quizData.voice_questions || []
        ],
        isPracticeMode: true,
        originalPrompt
      }));

      // 3. Redirect to new lesson
      router.push('/practice');
    } catch (error: any) {
      console.error("Practice Again - Full Error:", {
        error,
        message: error.message,
        stack: error.stack
      });
      // TODO: Show error toast to user
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