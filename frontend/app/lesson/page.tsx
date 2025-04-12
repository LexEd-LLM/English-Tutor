import { redirect } from "next/navigation";

import { getUserProgress, getUserSubscription } from "@/db/queries";
import { getGeneratedQuiz } from "@/actions/quiz";

import { Quiz } from "./quiz";

// Hàm tạo dữ liệu mẫu nếu không có dữ liệu từ backend
function generateDemoQuestions() {
  const demoQuestions = [];
  const questionTypes = ["What is", "Explain", "How does", "Why is", "Define"];
  const topic = "Unit 1";
  
  for (let i = 0; i < 5; i++) {
    const questionType = questionTypes[i % questionTypes.length];
    const question = `${questionType} ${topic}?`;
    
    demoQuestions.push({
      id: i + 1,
      question,
      type: "SELECT",
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
  if (!userProgress) {
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
  let questions = generatedQuestions;
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
    
    // Dùng type assertion để phù hợp với định nghĩa type
    const questionType = (q.type === "IMAGE" || q.type === "VOICE") 
      ? "SELECT" // Convert to SELECT for type compatibility
      : q.type as "SELECT" | "ASSIST";
      
    return {
      id: q.id,
      order: index + 1, // Thêm trường order
      lessonId: 1, // Giả định ID bài học
      type: questionType,
      originalType: q.type, // Lưu giữ loại câu hỏi gốc
      question: q.question,
      completed: false,
      // Thêm imageUrl và audioUrl nếu có
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
      initialLessonId={1} // Giả định ID bài học
      initialLessonChallenges={challenges}
      initialHearts={userProgress.hearts}
      initialPercentage={0} // Bắt đầu từ 0%
      userSubscription={userSubscription}
    />
  );
};

export default LessonPage;