"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DokExplanation } from "@/components/ui/ui-dok";
import { generateQuiz } from "@/actions/quiz";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { units } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Tooltip from "@radix-ui/react-tooltip";

type Unit = InferSelectModel<typeof units> & { completed: boolean };

interface QuizGeneratorProps {
  units: Unit[];
}

export const QuizGenerator = ({ units }: QuizGeneratorProps) => {
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dokLevel, setDokLevel] = useState<(1 | 2 | 3)[]>([1]);
  const [counts, setCounts] = useState({
    multipleChoice: 2,
    image: 1,
    voice: 2,
  });

  const handleGenerateQuiz = async () => {
    if (!selectedUnit) {
      toast.error("Please select a unit");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    try {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 300);

      const result = await generateQuiz(
        [parseInt(selectedUnit)],
        prompt || undefined,
        counts.multipleChoice,
        counts.image,
        counts.voice
      );

      clearInterval(interval);
      setProgress(100);

      if (result.success && result.quizId) {
        toast.success("Quiz generated successfully!");
        router.push(`/lesson?quizId=${result.quizId}`);
      } else {
        toast.error(result.error || "Failed to generate quiz");
      }
    } catch (error) {
      toast.error("An error occurred while generating the quiz");
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const dokTooltips: Record<1 | 2 | 3, string> = {
    1: "Nhớ lại",
    2: "Kỹ năng/Khái niệm",
    3: "Lập luận",
  };
  
  const renderDOKButton = (level: 1 | 2 | 3) => {
    const selected = dokLevel.includes(level);

    return (
      <Tooltip.Provider delayDuration={100}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              data-testid={`dok-option-${level}`}
              onClick={() => {
                setDokLevel((prev) => {
                  const updated =
                    prev.includes(level)
                      ? (prev.filter((l) => l !== level) as (1 | 2 | 3)[])
                      : ([...prev, level] as (1 | 2 | 3)[]);
                  console.log("DOK Levels selected:", updated);
                  return updated;
                });
              }}
              className={`text-xs font-semibold px-3 py-1 border flex items-center justify-center gap-1 rounded-full
                ${selected ? "bg-purple-100 text-purple-600 border-purple-400" : "text-gray-500 border-gray-300"}
              `}
            >
              {selected && <span className="text-green-600">✔</span>} Cấp độ {level}
            </button>
          </Tooltip.Trigger>

          <Tooltip.Content
            side="top"
            align="center"
            className="bg-black text-white text-xs rounded-md px-3 py-1 shadow-lg relative"
            sideOffset={6}
          >
            {dokTooltips[level]}
            <div
              className="absolute left-1/2 -bottom-1 w-2 h-2 bg-black transform -translate-x-1/2 rotate-45"
            />
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  };

  return (
    <Card className="w-full p-6 bg-green-50">
      <div className="space-y-6">
        {/* Unit Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Vui lòng chọn Unit</Label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a unit to generate quiz" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Custom Instructions</Label>
          <Input
            placeholder="Enter your custom instructions for the quiz..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Counts */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Số lượng câu hỏi</Label>
          <div className="grid grid-cols-3 gap-4">
            {["multipleChoice", "image", "voice"].map((type, i) => (
              <div key={i}>
                <Label>
                  {type === "multipleChoice"
                    ? "Câu hỏi trắc nghiệm"
                    : type === "image"
                    ? "Câu hỏi hình ảnh"
                    : "Câu hỏi âm thanh"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={type === "multipleChoice" ? 50 : type === "voice" ? 20 : 10}
                  value={counts[type as keyof typeof counts]}
                  onChange={(e) =>
                    setCounts((prev) => ({
                      ...prev,
                      [type]: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* DOK */}
        <div data-testid="dok-container" className="flex justify-between border-t border-gray-300 pt-4">
          <DokExplanation />
          <div className="flex gap-2">
            {renderDOKButton(1)}
            {renderDOKButton(2)}
            {renderDOKButton(3)}
          </div>
        </div>

        {/* Generate Button with Progress */}
        <div className="relative">
          <Button
            className="w-full overflow-hidden relative z-10"
            size="lg"
            onClick={handleGenerateQuiz}
            disabled={isLoading}
          >
            {isLoading ? "Đang tạo quiz..." : "Tạo quiz"}
          </Button>
          {isLoading && (
            <div
              className="absolute top-0 left-0 h-full bg-green-400 transition-all duration-300 ease-in-out z-0"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>
    </Card>
  );
};