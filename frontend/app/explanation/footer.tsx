import { useKey, useMedia } from "react-use";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type FooterProps = {
  onPracticeAgain: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useKey("Escape", onReturnToLearn, {}, [onReturnToLearn]);

  const handlePracticeClick = async () => {
    setIsLoading(true);
    try {
      await onPracticeAgain();
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
        </div>
      )}
      <footer className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-lg">
        <div className="mx-auto flex w-full max-w-[1140px] items-center justify-between">
          <Button
            onClick={onReturnToLearn}
            size={isMobile ? "sm" : "lg"}
            variant="ghost"
            disabled={isLoading}
          >
            Return to Learn
          </Button>
          <Button
            onClick={handlePracticeClick}
            size={isMobile ? "sm" : "lg"}
            variant="secondary"
            className="min-w-[120px]"
            disabled={isLoading}
          >
            Practice More
          </Button>
        </div>
      </footer>
    </>
  );
};
