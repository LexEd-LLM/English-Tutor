import { InfinityIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type ScoreValue = {
  correct: number;
  total: number;
};

type ResultCardProps = {
  value: number | ScoreValue | "∞";
  variant: "score" | "hearts";
  label?: string;
};

export const ResultCard = ({ value, variant, label }: ResultCardProps) => {
  const imageSrc = variant === "score" ? "/points.svg" : "/heart.svg";

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-2",
        variant === "score" && "border-orange-400 bg-orange-400",
        variant === "hearts" && "border-rose-500 bg-rose-500"
      )}
    >
      <div
        className={cn(
          "rounded-t-xl p-1.5 text-center text-xs font-bold uppercase text-white",
          variant === "score" && "bg-orange-400",
          variant === "hearts" && "bg-rose-500"
        )}
      >
        {label || (variant === "hearts" ? "Hearts Left" : "Score")}
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-white p-6 text-lg font-bold",
          variant === "score" && "text-orange-400",
          variant === "hearts" && "text-rose-500"
        )}
      >
        <Image
          src={imageSrc}
          alt={variant}
          height={30}
          width={30}
          className="mr-1.5"
        />
        {value === "∞" ? (
          <InfinityIcon className="h-6 w-6 stroke-[3]" />
        ) : typeof value === "object" ? (
          `${value.correct}/${value.total}`
        ) : (
          value
        )}
      </div>
    </div>
  );
};
