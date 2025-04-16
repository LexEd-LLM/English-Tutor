import { redirect } from "next/navigation";

import { getUserProgress, getUserSubscription } from "@/db/queries";
import { getGeneratedQuiz } from "@/actions/quiz";
import { questionTypeEnum } from "@/db/schema";

import { Quiz } from "./quiz";

type APIQuizQuestion = {
  id: number;
  question: string;
  type: typeof questionTypeEnum.enumValues[number];
  challengeOptions: {
    id: number;
    text: string;
    correct: boolean;
    imageSrc: string | null;
    audioSrc: string | null;
  }[];
  imageUrl?: string;
  audioUrl?: string;
};

// Hàm tạo dữ liệu mẫu nếu không có dữ liệu từ backend
function generateDemoQuestions(): APIQuizQuestion[] {
  const demoQuestions = [];
  const questionTypes = ["What is", "Explain", "How does", "Why is", "Define"];
  const topic = "Unit 1";
  
  for (let i = 0; i < 5; i++) {
    const questionType = questionTypes[i % questionTypes.length];
    const question = `${questionType} ${topic}?`;
    
    demoQuestions.push({
      id: i + 1,
      question,
      type: questionTypeEnum.enumValues[0],
      imageUrl: undefined,
      audioUrl: undefined,
      challengeOptions: [
        {
          id: 1,
          text: "Option A",
          correct: i % 4 === 0,
          imageSrc: null,
          audioSrc: null
        },
        {
          id: 2,
          text: "Option B",
          correct: i % 4 === 1,
          imageSrc: null,
          audioSrc: null
        },
        {
          id: 3,
          text: "Option C",
          correct: i % 4 === 2,
          imageSrc: null,
          audioSrc: null
        },
        {
          id: 4,
          text: "Option D",
          correct: i % 4 === 3,
          imageSrc: null,
          audioSrc: null
        }
      ]
    });
  }
  
  return demoQuestions;
}

const LessonPage = async () => {
  // Bắt đầu lấy dữ liệu người dùng
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  
  // Bắt đầu lấy dữ liệu quiz từ database
  const generatedQuestionsData = getGeneratedQuiz();

  // Đợi tất cả Promise hoàn thành
  const [userProgress, userSubscription, generatedQuestions] = await Promise.all([
    userProgressData,
    userSubscriptionData,
    generatedQuestionsData,
  ]);

  // Kiểm tra user progress
  if (!userProgress?.userId) {
    return redirect("/learn");
  }

  // Kiểm tra câu hỏi đã tạo
  if (generatedQuestions && Array.isArray(generatedQuestions)) {
    if (generatedQuestions.length === 0) {
      // Nếu user đã đăng nhập nhưng không có dữ liệu quiz, thông báo và chuyển hướng
      return redirect("/learn?error=no-quiz-data");
    }
  } else {
    // Nếu user đã đăng nhập nhưng không có dữ liệu quiz, thông báo và chuyển hướng
    return redirect("/learn?error=no-quiz-data");
  }
  
  // Đảm bảo generatedQuestions là một mảng hợp lệ
  let questions = generatedQuestions as APIQuizQuestion[];
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    questions = generateDemoQuestions();
    
    if (questions.length === 0) {
      return redirect("/learn");
    }
  }

  // Chuyển đổi từ generatedQuestions sang format mà Quiz component cần
  const challenges = questions.map((q, index) => {
    // Kiểm tra xem q có imageUrl hoặc audioUrl không
    const hasImageUrl = 'imageUrl' in q && q.imageUrl;
    const hasAudioUrl = 'audioUrl' in q && q.audioUrl;
    
    return {
      id: q.id,
      order: index + 1,
      lessonId: 1,
      type: q.type,
      originalType: q.type,
      question: q.question,
      completed: false,
      imageUrl: hasImageUrl ? q.imageUrl : undefined,
      audioUrl: hasAudioUrl ? q.audioUrl : undefined,
      challengeOptions: q.challengeOptions.map((option) => ({
        id: option.id,
        challengeId: q.id,
        text: option.text,
        correct: option.correct,
        imageSrc: option.imageSrc,
        audioSrc: option.audioSrc,
      })),
    };
  });

  return (
    <Quiz
      initialLessonId={1}
      initialLessonChallenges={challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={0}
      userSubscription={userSubscription}
      userId={userProgress.userId}
    />
  );
};

export default LessonPage;