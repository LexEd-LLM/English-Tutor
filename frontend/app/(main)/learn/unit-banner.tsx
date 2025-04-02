"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput } from "./prompt-input";
import { QuestionSlider } from "./question-slider";
import { ProcessStatus } from "./process-status";
import { useRouter } from "next/navigation";
import { generateQuiz } from "@/actions/quiz";

export const UnitBanner = () => {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Kiểm tra URL query params khi component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = queryParams.get('error');
    
    if (errorParam === 'no-quiz-data') {
      setError('No quiz data found. Please generate a new quiz.');
    }
  }, []);

  const handleStartGeneration = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    setStatus("Starting generation...");
    setProgress(10);

    // Tiến trình với status
    setTimeout(() => {
      setStatus("Getting relevant content...");
      setProgress(30);
    }, 500);

    // Giả lập quá trình tạo câu hỏi để hiển thị tiến trình
    setTimeout(() => {
      setStatus("Generating questions...");
      setProgress(60);
    }, 1000);

    // Gọi API để tạo câu hỏi
    try {
      const result = await generateQuiz(prompt, questionCount);
      
      if (result.success) {
        // Tiếp tục hiển thị tiến trình
        setTimeout(() => {
          setStatus("Preparing quiz...");
          setProgress(90);
        }, 500);

        // Hoàn thành
        setTimeout(() => {
          setStatus("Ready!");
          setProgress(100);
          setIsGenerating(false);
        }, 1000);
      } else {
        setError(result.error || "Error generating quiz");
        setIsGenerating(false);
        setStatus("Error occurred");
        setProgress(0);
      }
    } catch (err) {
      console.error("Error in handleStartGeneration:", err);
      setError("Failed to generate quiz questions");
      setIsGenerating(false);
      setStatus("Error occurred");
      setProgress(0);
    }
  };

  const handleStartQuiz = () => {
    try {
      console.log("Redirecting to /lesson");
      router.push("/lesson");
    } catch (error) {
      console.error("Navigation error:", error);
      setError("Error navigating to quiz page");
    }
  };

  return (
    <div className="flex flex-col gap-y-8 rounded-xl bg-white border-2 border-gray-200 p-5 text-neutral-700">
      <div className="space-y-4">
        <PromptInput 
          value={prompt}
          onChange={setPrompt}
        />
        <QuestionSlider
          value={questionCount}
          onChange={setQuestionCount}
        />
        <ProcessStatus
          status={status}
          progress={progress}
        />

        {error && (
          <div className="p-3 bg-red-500 rounded-md text-white text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center items-center mt-4">
          {progress === 100 ? (
            <Button 
              onClick={handleStartQuiz}
              className="bg-blue-500 text-white hover:bg-blue-600 font-bold px-8 py-6 text-lg"
            >
              START QUIZ
            </Button>
          ) : (
            <Button 
              onClick={handleStartGeneration}
              disabled={isGenerating || !prompt}
              className="bg-blue-500 text-white hover:bg-blue-600 font-bold px-8 py-6 text-lg"
            >
              {isGenerating ? `GENERATING... ${progress}%` : "GENERATE"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
