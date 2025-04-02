"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { generateQuiz } from "@/actions/quiz";
import { Button } from "@/components/ui/button";
import { PromptInput } from "./prompt-input";

export const Unit = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [prompt, setPrompt] = useState("");
  const [multipleChoiceCount, setMultipleChoiceCount] = useState(6);
  const [imageCount, setImageCount] = useState(2);
  const [voiceCount, setVoiceCount] = useState(2);

  const onSubmit = () => {
    if (!prompt) {
      toast.error("Please enter a topic");
      return;
    }

    startTransition(async () => {
      try {
        const result = await generateQuiz(
          prompt,
          multipleChoiceCount,
          imageCount,
          voiceCount
        );

        if (result.success) {
          router.push("/lesson");
        } else {
          toast.error(result.error || "Something went wrong");
        }
      } catch (error) {
        toast.error("Failed to generate quiz");
      }
    });
  };

  const handleCountChange = (type: 'multiple' | 'image' | 'voice', value: number) => {
    switch (type) {
      case 'multiple':
        setMultipleChoiceCount(value);
        break;
      case 'image':
        setImageCount(value);
        break;
      case 'voice':
        setVoiceCount(value);
        break;
    }
  };

  return (
    <div className="h-full space-y-4 p-6">
      <div className="flex flex-col items-start gap-y-4">
        <h1 className="text-2xl font-bold">
          Tạo bài kiểm tra
        </h1>
        <p className="text-muted-foreground">
          Nhập chủ đề bạn muốn ôn tập và chọn số lượng câu hỏi cho mỗi loại
        </p>
      </div>

      <div className="h-full space-y-4">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          multipleChoiceCount={multipleChoiceCount}
          imageCount={imageCount}
          voiceCount={voiceCount}
          onCountChange={handleCountChange}
        />

        <Button
          disabled={isPending || !prompt}
          onClick={onSubmit}
          className="w-full"
        >
          {isPending ? "Đang tạo bài kiểm tra..." : "Tạo bài kiểm tra"}
        </Button>
      </div>
    </div>
  );
};
