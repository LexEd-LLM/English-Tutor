import { redirect } from "next/navigation";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { Quiz } from "./quiz";
import { lessonApi } from "./api";

interface PageProps {
  searchParams: {
    quizId?: string;
  };
}

const validTypes = ["FILL_IN_BLANK", "TRANSLATION", "PRONUNCIATION", "VOICE", "IMAGE"] as const;
type ChallengeType = typeof validTypes[number];

function normalizeType(type: string): ChallengeType {
  const upper = type.toUpperCase();
  if (validTypes.includes(upper as ChallengeType)) {
    return upper as ChallengeType;
  }
  throw new Error(`Invalid challenge type: ${type}`);
}

const LessonPage = async ({ searchParams }: PageProps) => {
  try {
    const quizId = searchParams.quizId;
    
    if (!quizId) {
      return redirect("/learn?error=no-quiz-id");
    }

    // Get user data
    const [userProgress, userSubscription] = await Promise.all([
      getUserProgress(),
      getUserSubscription(),
    ]);

    if (!userProgress?.userId) {
      return redirect("/learn");
    }

    // Fetch quiz data using the new API
    const quizData = await lessonApi.fetchQuizById(parseInt(quizId));
    
    // Combine all questions into challenges array
    const challenges = [
      ...quizData.multiple_choice_questions,
      ...quizData.image_questions,
      ...quizData.voice_questions,
      ...quizData.pronunc_questions
    ].map((q, index) => ({
      ...q,
      type: normalizeType(q.type),
      order: index + 1,
      quizId: parseInt(quizId),
      lessonId: 1,
      completed: false,
    }));

    return (
      <Quiz
        initialLessonId={1}
        initialQuizId={parseInt(quizId)}
        initialQuestions={challenges}
        initialHearts={userProgress.hearts}
        initialPercentage={0}
        userId={userProgress.userId}
      />
    );
  } catch (error) {
    console.error('Error in LessonPage:', error);
    return redirect("/learn?error=unexpected");
  }
};

export default LessonPage;