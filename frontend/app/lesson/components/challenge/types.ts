import { questionTypeEnum } from "@/db/schema";

export type ChallengeProps = {
  id: number;
  type: typeof questionTypeEnum.enumValues[number];
  question: string;
  options: {
    id: number;
    challengeId?: number;
    text: string;
    correct: boolean;
    imageSrc?: string | null;
    audioSrc?: string | null;
  }[];
  selectedOption?: number;
  status: "none" | "selected";
  onSelect: (id: number) => void;
  imageUrl?: string;
  audioUrl?: string;
};
