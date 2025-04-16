"use client";

import { Check } from "lucide-react";

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
  return (
    <Button
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      className={cn(
        "relative w-full p-0 flex flex-col items-start justify-between h-auto",
        "hover:bg-accent hover:text-accent-foreground",
        active && "border-primary border-2"
      )}
    >
      <div className="p-6 flex flex-col gap-4 w-full">
        <div className="font-bold line-clamp-2">{title}</div>
        
        {image_url && (
          <div className="w-full h-[160px] relative overflow-hidden rounded-lg">
            <img 
              src={image_url} 
              alt={title}
              className="object-contain w-full h-full"
            />
          </div>
        )}
        
        <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{description}</p>
      </div>
      
      {active && (
        <div className="absolute top-3 right-3">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </Button>
  );
};
