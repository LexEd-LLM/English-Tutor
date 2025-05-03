import { useKey, useMedia } from "react-use";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type FooterProps = {
  onPracticeAgain: () => void;
  onReturnToLearn: () => void;
  userId?: string;
  quizId?: number;
};

export const Footer = ({
  onPracticeAgain,
  onReturnToLearn,
  userId,
  quizId,
}: FooterProps) => {
  const isMobile = useMedia("(max-width: 768px)");
  const router = useRouter();

  useKey("Escape", onReturnToLearn, {}, [onReturnToLearn]);

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

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-lg">
      <div className="mx-auto flex w-full max-w-[1140px] items-center justify-between">
        <Button
          onClick={onReturnToLearn}
          size={isMobile ? "sm" : "lg"}
          variant="ghost"
        >
          Return to Learn
        </Button>
        <Button
          onClick={onPracticeAgain}
          size={isMobile ? "sm" : "lg"}
          variant="secondary"
          className="min-w-[120px]"
        >
          Practice More
        </Button>
      </div>
    </footer>
  );
}; 