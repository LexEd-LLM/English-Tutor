import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Header } from "@/components/header";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getUnits,
  getUserProgress,
  getUserSubscription,
  getUserHearts,
} from "@/db/queries";

import { QuizGenerator } from "./quiz-generator";

const LearnPage = async () => {
  const userProgressData = getUserProgress();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();
  const userHeartsData = getUserHearts();

  const [
    userProgress,
    units,
    userSubscription,
    userHearts,
  ] = await Promise.all([
    userProgressData,
    unitsData,
    userSubscriptionData,
    userHeartsData,
  ]);

  if (!userProgress || !userProgress.curriculum)
    redirect("/courses");

  if (!userHearts)
    redirect("/sign-in");

  const isVIP = userSubscription?.isLifetime || 
    (userSubscription?.isActive && userSubscription?.endDate && 
     userSubscription.endDate.getTime() > Date.now());

  return (
    <div className="flex flex-col h-full">
      <Header 
        hearts={userHearts.hearts} 
        userImage={userHearts.imageSrc}
        activeCourse={userProgress.curriculum}
        isVIP={isVIP}
      />
      <div className="flex flex-row-reverse gap-[48px] px-6 flex-1">
        <StickyWrapper>
          <UserProgress
            activeCourse={userProgress.curriculum}
            progressPercent={userProgress.progressPercent}
          />
        </StickyWrapper>
        <FeedWrapper>
          <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-center">Generate Quiz</h2>
            <QuizGenerator units={units} />
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
};

export default LearnPage;
