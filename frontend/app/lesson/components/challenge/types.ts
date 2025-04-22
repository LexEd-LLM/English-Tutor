import { questionTypeEnum } from "@/db/schema";

// Dùng chung cho mọi challenge
export type BaseChallengeProps = {
  id: number;
  type: typeof questionTypeEnum.enumValues[number];
  question: string;
  status: "none" | "selected";
  onSelect: (answer: number | string) => void;
  imageUrl?: string;
  audioUrl?: string;
};

// Dạng câu hỏi trắc nghiệm
export type MultipleChoiceChallengeProps  = BaseChallengeProps & {
  options: {
    id: number;
    challengeId?: number;
    text: string;
    correct: boolean;
    imageSrc?: string | null;
    audioSrc?: string | null;
  }[];
  selectedOption?: number;
};

// Dạng phát âm (không có option, không selectedOption)
export type PronunciationChallengeProps = BaseChallengeProps & {
  options?: undefined;
  selectedOption?: undefined;
};

// Gộp lại để dùng chung
export type ChallengeProps = MultipleChoiceChallengeProps | PronunciationChallengeProps;