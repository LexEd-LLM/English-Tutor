import { redirect } from "next/navigation";

import { getUserProgress, getUserSubscription } from "@/db/queries";
import { getGeneratedQuiz } from "@/actions/quiz";

import { Quiz } from "./quiz";

// Hàm tạo dữ liệu mẫu nếu không có dữ liệu từ backend
function generateDemoQuestions() {
  console.log("Generating demo questions as fallback");
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
  
  console.log(`Created ${demoQuestions.length} demo questions`);
  return demoQuestions;
}

const LessonPage = async () => {
  console.log("=== LessonPage component started ===");
  
  // Bắt đầu lấy dữ liệu người dùng
  console.log("Fetching user data...");
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  
  // Bắt đầu lấy dữ liệu quiz từ database
  console.log("Fetching generated quiz questions directly from database...");
  const generatedQuestionsData = getGeneratedQuiz();

  // Đợi tất cả Promise hoàn thành
  console.log("Waiting for all promises to resolve...");
  const [userProgress, userSubscription, generatedQuestions] = await Promise.all([
    userProgressData,
    userSubscriptionData,
    generatedQuestionsData,
  ]);

  // Kiểm tra user progress
  if (!userProgress) {
    console.log("No user progress found, redirecting to /learn");
    return redirect("/learn");
  }
  console.log(`User progress found for user: ${userProgress.userId}`);

  // Kiểm tra câu hỏi đã tạo
  if (generatedQuestions && Array.isArray(generatedQuestions)) {
    console.log(`Retrieved ${generatedQuestions.length} questions from database`);
    
    if (generatedQuestions.length > 0) {
      console.log(`First question: ${JSON.stringify(generatedQuestions[0]).substring(0, 100)}...`);
    } else {
      console.log("Database returned an empty array of questions");
      
      // Nếu user đã đăng nhập nhưng không có dữ liệu quiz, thông báo và chuyển hướng
      console.log("User is logged in but no quiz data. Redirecting to learn page...");
      return redirect("/learn?error=no-quiz-data");
    }
  } else {
    console.log("No valid questions array returned from database");
    // Nếu user đã đăng nhập nhưng không có dữ liệu quiz, thông báo và chuyển hướng
    console.log("User is logged in but no quiz data. Redirecting to learn page...");
    return redirect("/learn?error=no-quiz-data");
  }
  
  // Đảm bảo generatedQuestions là một mảng hợp lệ
  let questions = generatedQuestions;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    console.log("No valid quiz questions found, using demo questions");
    questions = generateDemoQuestions();
    
    if (questions.length === 0) {
      console.log("No demo questions available, redirecting to /learn");
      return redirect("/learn");
    }
  }

  // Chuyển đổi từ generatedQuestions sang format mà Quiz component cần
  console.log("Converting questions to challenge format for Quiz component");
  const challenges = questions.map((q, index) => ({
    id: q.id,
    order: index + 1, // Thêm trường order
    lessonId: 1, // Giả định ID bài học
    type: q.type as "SELECT" | "ASSIST", // Type assertion
    question: q.question,
    completed: false,
    challengeOptions: q.challengeOptions.map((option) => ({
      id: option.id,
      challengeId: q.id,
      text: option.text,
      correct: option.correct,
      imageSrc: option.imageSrc,
      audioSrc: option.audioSrc,
    })),
  }));

  console.log(`Final challenges for Quiz component: ${challenges.length}`);
  console.log("=== LessonPage component completed ===");

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
