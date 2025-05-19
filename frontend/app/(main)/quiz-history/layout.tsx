import { Header } from "@/components/header";
import { getUserHearts, getUserSubscription } from "@/db/queries";

const QuizHistoryLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const userHearts = await getUserHearts();
  const userSubscription = await getUserSubscription();

  if (!userHearts) {
    return null;
  }

  const isVIP = userSubscription?.isLifetime || 
    (userSubscription?.isActive && userSubscription?.endDate && 
     userSubscription.endDate.getTime() > Date.now());

  return (
    <div className="flex h-full flex-col">
      <Header 
        hearts={userHearts.hearts} 
        userImage={userHearts.imageSrc}
        isVIP={isVIP} 
      />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default QuizHistoryLayout; 