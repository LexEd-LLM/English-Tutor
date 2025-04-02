import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProcessStatusProps = {
  status: string;
  progress: number;
};

export const ProcessStatus = ({
  status,
  progress,
}: ProcessStatusProps) => {
  return (
    <div className="w-full space-y-2">
      <Label>Status: {status}</Label>
      <Progress 
        value={progress} 
        className={cn(
          "w-full h-3",
          "bg-gray-200/30" // Màu nền progress bar
        )}
      />
    </div>
  );
}; 