"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardProps = {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  onClick: (id: number) => void;
  disabled?: boolean;
  active?: boolean;
};

export const Card = ({
  id,
  title,
  description,
  image_url,
  onClick,
  disabled,
  active,
}: CardProps) => {
  /* ---------- maintenance-block ---------- */
  const allowed = id === 12;          // chỉ course #12 được phép
  /* --------------------------------------- */

  return (
    <Button
      type="button"
      onClick={() => allowed && onClick(id)}          // chặn click
      disabled={disabled || !allowed}                 // chặn focus/tab
      className={cn(
        "relative w-full p-0 flex flex-col items-start justify-between h-auto",
        "hover:bg-accent hover:text-accent-foreground",
        active && "border-primary border-2",
        !allowed && "opacity-50"                      // làm mờ
      )}
    >
      <div className="p-6 flex flex-col gap-4 w-full">
        <div className="font-bold line-clamp-2">{title}</div>

        {image_url && (
          <div className="w-full h-[160px] relative overflow-hidden rounded-lg">
            <Image
              src={image_url}
              alt={title}
              className="object-contain w-full h-full"
              fill
              sizes="100%"
            />
          </div>
        )}

        <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
          {description}
        </p>
      </div>

      {/* hiển thị vòng tròn “Maintenance” khi khóa */}
      {!allowed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="flex items-center justify-center w-24 h-24 rounded-full bg-black/70 text-white text-xs font-semibold">
            Maintenance
          </span>
        </div>
      )}

      {allowed && active && (
        <div className="absolute top-3 right-3">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </Button>
  );
};

