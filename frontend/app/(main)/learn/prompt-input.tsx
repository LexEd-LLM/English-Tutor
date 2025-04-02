"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";
import { cn } from "@/lib/utils";
import { QuestionCountInput } from "./question-count-input";

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  multipleChoiceCount: number;
  imageCount: number;
  voiceCount: number;
  onCountChange: (type: 'multiple' | 'image' | 'voice', value: number) => void;
};

export const PromptInput = ({
  value,
  onChange,
  multipleChoiceCount,
  imageCount,
  voiceCount,
  onCountChange,
}: PromptInputProps) => {
  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <Label>Nhập chủ đề bạn muốn ôn tập</Label>
        <Input
          placeholder="Ví dụ: Từ vựng về động vật, Ngữ pháp thì hiện tại..."
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={cn(
            "min-h-[60px]", 
            "text-black",
            "placeholder:text-gray-500"
          )}
        />
      </div>
      
      <QuestionCountInput
        multipleChoiceCount={multipleChoiceCount}
        imageCount={imageCount}
        voiceCount={voiceCount}
        onCountChange={onCountChange}
      />
    </div>
  );
}; 