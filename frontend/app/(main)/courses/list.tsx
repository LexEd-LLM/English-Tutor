"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { upsertUserProgress } from "@/actions/user-progress";
import { curriculums, userCurriculumProgress } from "@/db/schema";

import { Card } from "./card";

type ListProps = {
  courses: (typeof curriculums.$inferSelect)[];
  activeCourseId?: typeof userCurriculumProgress.$inferSelect.curriculumId;
};

export const List = ({
  courses,
  activeCourseId,
}: ListProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = (curriculumId: number) => {
    if (isPending) return;

    if (curriculumId === activeCourseId) {
      router.push("/learn");
      return;
    }

    startTransition(() => {
      upsertUserProgress(curriculumId)
        .then(() => {
          router.push('/learn');
        })
        .catch(() => toast.error("Something went wrong"));
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {courses.map((course) => {
        return (
          <Card
            key={course.id}
            id={course.id}
            title={course.title}
            description={course.description || ""}
            image_url={course.image_url || ""}
            onClick={onClick}
            disabled={isPending}
            active={course.id === activeCourseId}
          />
        );
      })}
    </div>
  );
};
