import { Header } from "@/components/header";
import { getUserHearts } from "@/db/queries";

const QuizHistoryLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const userHearts = await getUserHearts();

  if (!userHearts) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <Header hearts={userHearts.hearts} userImage={userHearts.imageSrc} />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default QuizHistoryLayout; 