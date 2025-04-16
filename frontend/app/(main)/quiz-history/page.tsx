import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";

import { getUserQuizzes } from "@/db/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const QuizHistoryPage = async () => {
  const quizzes = await getUserQuizzes();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((quiz) => (
          <Link 
            key={quiz.id} 
            href={`/lesson/explanations?quizId=${quiz.id}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="relative w-full h-[200px] p-0">
              <Image
                src={
                    quiz.unit.curriculum?.image_url?.startsWith("/")
                    ? quiz.unit.curriculum.image_url
                    : "/" + quiz.unit.curriculum?.image_url || "/default-curriculum.png"
                }
                alt={quiz.unit.curriculum?.title || `Unit ${quiz.unit.order}`}
                fill
                className="object-cover rounded-t-lg"
              />
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {quiz.unit.curriculum?.title}
                    </p>
                    <h3 className="font-semibold">
                      Unit {quiz.unit.order}: {quiz.unit.title}
                    </h3>
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