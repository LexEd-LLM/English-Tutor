import { NextRequest, NextResponse } from 'next/server';

// Định nghĩa kiểu dữ liệu cho request từ client
type RequestData = {
  prompt: string;
  num_questions: number;
};

// Options GET để kiểm tra API route có hoạt động không
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "API route is working" 
  });
}

// Hàm để tạo câu hỏi demo khi backend không hoạt động
export async function POST(request: NextRequest) {
  try {
    console.log("API route POST called");
    
    // Lấy dữ liệu từ request
    const requestData: RequestData = await request.json();
    console.log("Request data:", requestData);
    
    // Tạo dữ liệu mẫu
    const demoQuestions = [];
    const questionTypes = ["What is", "Explain", "How does", "Why is", "Define"];
    const prompt = requestData.prompt || "example topic";
    
    for (let i = 0; i < Math.min(requestData.num_questions, 10); i++) {
      const questionType = questionTypes[i % questionTypes.length];
      const question = `${questionType} ${prompt}?`;
      
      demoQuestions.push({
        id: i + 1,
        question,
        type: "SELECT",
        challengeOptions: [
          {
            id: 1,
            text: "Option A",
            correct: i % 4 === 0, // First option correct for 25% of questions
            imageSrc: null,
            audioSrc: null
          },
          {
            id: 2,
            text: "Option B",
            correct: i % 4 === 1, // Second option correct for 25% of questions
            imageSrc: null,
            audioSrc: null
          },
          {
            id: 3,
            text: "Option C",
            correct: i % 4 === 2, // Third option correct for 25% of questions
            imageSrc: null,
            audioSrc: null
          },
          {
            id: 4,
            text: "Option D",
            correct: i % 4 === 3, // Fourth option correct for 25% of questions
            imageSrc: null,
            audioSrc: null
          }
        ]
      });
    }

    console.log(`Generated ${demoQuestions.length} questions successfully`);
    return NextResponse.json({ questions: demoQuestions });
  } catch (error) {
    console.error(`Error in API route: ${error}`);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
} 