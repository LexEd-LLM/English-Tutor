import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { getUserQuizzes, getUserQuizAccuracy } from "@/db/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const QuizHistoryPage = async () => {
  const quizzes = await getUserQuizzes();
  const totalQuizzes = quizzes.length;
  const quizzesWithAccuracy = await Promise.all(
    quizzes.map(async (quiz) => {
      const accuracy = await getUserQuizAccuracy(quiz.id);
      return { ...quiz, accuracy };
    })
  );

  if (!quizzes) {
    redirect("/learn");
  }

  return (
    <div className="h-full p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Quiz History</h1>
        <p className="text-muted-foreground">
          View your quiz history and performance
        </p>
      </div>

      <div className="sticky top-0 bg-white border-b p-2 shadow-sm">
        <span className="font-semibold">{totalQuizzes} Kết quả</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {quizzesWithAccuracy.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/explanation?quizId=${quiz.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-[360px]">
                <CardHeader className="relative w-full h-[200px] p-0 bg-green-100 overflow-hidden">
                  <Image
                    src={"/quiz_placeholder.png"}
                    alt={quiz.unit.curriculum?.title || `Unit ${quiz.unit.order}`}
                    width={400}
                    height={160}
                    className="object-contain w-full h-full"
                    loading="lazy"
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.unit.curriculum?.title}
                      </p>
                      <h3 className="font-semibold">
                        {quiz.title ?? `Unit ${quiz.unit.order}: ${quiz.unit.title}`}
                      </h3>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>Accuracy: {quiz.accuracy}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{quiz.questions.length} questions</span>
                      <span>{format(new Date(quiz.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
        ))}
      </div>
    </div>
  );
};

export default QuizHistoryPage;
