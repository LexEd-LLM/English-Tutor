import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { curriculums } from "@/db/schema";

type UserProgressProps = {
  activeCourse: typeof curriculums.$inferSelect;
  progressPercent: number;
};

export const UserProgress = ({
  activeCourse,
  progressPercent,
}: UserProgressProps) => {
  return (
    <div className="w-full min-w-[240px] bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-x-2">
        <Link href="/courses">
          <h2 className="font-bold text-neutral-700">
            {activeCourse.title}
          </h2>
        </Link>
      </div>
      <div className="mt-4">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-muted-foreground text-sm mt-2">
          {progressPercent}% Complete
        </p>
      </div>
      <Button
        asChild
        variant="secondary"
        className="w-full mt-4"
      >
        <Link href="/courses">
          Change Course
        </Link>
      </Button>
    </div>
  );
};
