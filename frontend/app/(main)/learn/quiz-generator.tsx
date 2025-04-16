"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateQuiz } from "@/actions/quiz";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { units } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

type Unit = InferSelectModel<typeof units> & { completed: boolean };

interface QuizGeneratorProps {
  units: Unit[];
}

export const QuizGenerator = ({ units }: QuizGeneratorProps) => {
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState({
    multipleChoice: 3,
    image: 1,
    voice: 1,
  });

  const handleGenerateQuiz = async () => {
    if (!selectedUnit) {
      toast.error("Please select a unit");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateQuiz(
        [parseInt(selectedUnit)],
        prompt || undefined,
        counts.multipleChoice,
        counts.image,
        counts.voice
      );

      if (result.success) {
        toast.success("Quiz generated successfully!");
        router.push("/lesson");
      } else {
        toast.error(result.error || "Failed to generate quiz");
      }
    } catch (error) {
      toast.error("An error occurred while generating the quiz");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full p-6 bg-green-50">
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Select Unit</Label>
          <Select
            value={selectedUnit}
            onValueChange={setSelectedUnit}
          >
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

        <div className="space-y-4">
          <Label className="text-base font-semibold">Custom Instructions</Label>
          <Input
            placeholder="Enter your custom instructions for the quiz..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Number of Questions</Label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Multiple Choice</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={counts.multipleChoice}
                onChange={(e) => setCounts(prev => ({
                  ...prev,
                  multipleChoice: parseInt(e.target.value) || 1
                }))}
              />
            </div>
            <div>
              <Label>Image Questions</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={counts.image}
                onChange={(e) => setCounts(prev => ({
                  ...prev,
                  image: parseInt(e.target.value) || 0
                }))}
              />
            </div>
            <div>
              <Label>Voice Questions</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={counts.voice}
                onChange={(e) => setCounts(prev => ({
                  ...prev,
                  voice: parseInt(e.target.value) || 0
                }))}
              />
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerateQuiz}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Quiz"}
        </Button>
      </div>
    </Card>
  );
}; 