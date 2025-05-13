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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    multipleChoice: 20,
    image: 5,
    voice: 5,
  });

  const handleGenerateQuiz = async () => {
    if (!selectedUnit) {
      toast.error("Please select a unit");
      return;
    }

    if (dokLevel.length === 0) {
      toast.error("Please select at least one difficulty level (DOK)");
      return;
    }

    // Kiểm tra giá trị âm
    if (counts.multipleChoice < 0 || counts.image < 0 || counts.voice < 0) {
      toast.error("Number of questions cannot be negative");
      return;
    }

    // Kiểm tra có ít nhất 1 loại câu hỏi
    if (counts.multipleChoice === 0 && counts.image === 0 && counts.voice === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    if (counts.multipleChoice > 50 || counts.image > 10 || counts.voice > 20) {
      toast.error("You choose too many questions");
      return;
    }
  
    setIsLoading(true);
    try {
      const result = await generateQuiz(
        [parseInt(selectedUnit)],
        dokLevel,
        prompt || undefined,
        counts.multipleChoice,
        counts.image,
        counts.voice,
      );
  
      if (result.success && result.quizId) {
        toast.success("Quiz generated successfully!");
        router.push(`/lesson?quizId=${result.quizId}&lessonId=0`);
      } else {
        toast.error(result.error || "Failed to generate quiz");
      }
    } catch (error) {
      toast.error("An error occurred while generating the quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const dokTooltips: Record<1 | 2 | 3, string> = {
    1: "Remember",
    2: "Skills/Concepts",
    3: "Reasoning",
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
              {selected && <span className="text-green-600 hidden md:inline">✔</span>} Level {level}
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
    <div className="flex justify-center md:justify-start">
      <Card className="w-full p-6 bg-green-50">
        <div className="space-y-6">
          {/* Unit Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Please select a unit</Label>
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
            <Label className="text-base font-semibold">Number of questions</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["multipleChoice", "image", "voice"].map((type, i) => (
                <div key={i}>
                  <Label>
                  <span className="md:inline hidden">
                    {type === "multipleChoice"
                      ? "Multiple choice"
                      : type === "image"
                      ? "Image"
                      : "Audio"}
                  </span>
                  <span className="inline md:hidden">
                    {type === "multipleChoice"
                      ? "MCQs"
                      : type === "image"
                      ? "Image"
                      : "Audio"}
                  </span>
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
            className="w-full relative flex items-center justify-center gap-2"
            size="lg"
            onClick={handleGenerateQuiz}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            {isLoading ? "Generating..." : "Generate quiz"}
          </Button>
          </div>
        </div>
        {/* Full-screen loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          </div>
        )}
      </Card>
    </div>
  );
};