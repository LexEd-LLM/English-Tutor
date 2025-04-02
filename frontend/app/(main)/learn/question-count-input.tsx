"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuestionCountInputProps {
  multipleChoiceCount: number;
  imageCount: number;
  voiceCount: number;
  onCountChange: (type: 'multiple' | 'image' | 'voice', value: number) => void;
}

export const QuestionCountInput = ({
  multipleChoiceCount,
  imageCount,
  voiceCount,
  onCountChange,
}: QuestionCountInputProps) => {
  return (
    <div className="w-full space-y-4 rounded-xl bg-green-50 p-4">
      <div className="space-y-2">
        <Label htmlFor="multipleChoice">Câu hỏi trắc nghiệm</Label>
        <Input
          id="multipleChoice"
          type="number"
          min={1}
          max={10}
          value={multipleChoiceCount}
          onChange={(e) => onCountChange('multiple', parseInt(e.target.value) || 1)}
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="image">Câu hỏi hình ảnh</Label>
        <Input
          id="image"
          type="number"
          min={0}
          max={5}
          value={imageCount}
          onChange={(e) => onCountChange('image', parseInt(e.target.value) || 0)}
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="voice">Câu hỏi phát âm</Label>
        <Input
          id="voice"
          type="number"
          min={0}
          max={5}
          value={voiceCount}
          onChange={(e) => onCountChange('voice', parseInt(e.target.value) || 0)}
          className="w-full"
        />
      </div>
    </div>
  );
}; 