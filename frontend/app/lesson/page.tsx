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

type GeneratedQuizResponse = {
  questions: APIQuizQuestion[];
  quizId: number;
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
  try {
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
    const quizData = generatedQuestions as GeneratedQuizResponse;
    console.log('Generated quiz data:', quizData); // Debug log

    if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error('No quiz data or questions:', quizData);
      return redirect("/learn?error=no-quiz-data");
    }

    // Lấy quizId từ kết quả generateQuiz
    const quizId = quizData.quizId;
    if (!quizId) {
      console.error("No quiz ID returned from generateQuiz:", quizData);
      return redirect("/learn?error=no-quiz-id");
    }

    console.log('Quiz data loaded:', { 
      quizId, 
      questionCount: quizData.questions.length,
      firstQuestion: quizData.questions[0]
    }); // Enhanced debug log

    // Chuyển đổi từ generatedQuestions sang format mà Quiz component cần
    const challenges = quizData.questions.map((q: APIQuizQuestion, index: number) => {
      // Kiểm tra xem q có imageUrl hoặc audioUrl không
      const hasImageUrl = 'imageUrl' in q && q.imageUrl;
      const hasAudioUrl = 'audioUrl' in q && q.audioUrl;
      
      const challenge = {
        id: q.id,
        order: index + 1,
        lessonId: 1, // lessonId bắt đầu từ 1 cho quiz mới
        quizId: quizId, // Sử dụng quizId từ generateQuiz
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

      return challenge;
    });

    console.log('Challenges created:', { 
      count: challenges.length, 
      firstChallenge: challenges[0],
      quizIdInFirstChallenge: challenges[0]?.quizId
    }); // Enhanced debug log

    return (
      <Quiz
        initialLessonId={1} // lessonId bắt đầu từ 1 cho quiz mới
        initialQuizId={quizId} // Truyền quizId từ generateQuiz
        initialLessonChallenges={challenges}
        initialHearts={userProgress.hearts}
        initialPercentage={0}
        userSubscription={userSubscription}
        userId={userProgress.userId}
      />
    );
  } catch (error) {
    console.error('Error in LessonPage:', error);
    return redirect("/learn?error=unexpected");
  }
};

export default LessonPage;