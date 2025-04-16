"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type UnitProps = {
  id: number;
  order: number;
  title: string;
  description: string;
  completed?: boolean;
  isActive?: boolean;
};

export const Unit = ({
  id,
  order,
  title,
  description,
  completed,
  isActive,
}: UnitProps) => {
  const status = completed ? "completed" : isActive ? "active" : "locked";

  return (
    <div className="mb-4">
      <div className="flex items-center gap-x-4 mb-2">
        <div className={`
          rounded-full flex items-center justify-center
          ${status === "active" && "bg-primary text-primary-foreground"}
          ${status === "completed" && "bg-emerald-500 text-emerald-50"}
          ${status === "locked" && "bg-neutral-200 text-neutral-500"}
          h-10 w-10 shrink-0
        `}>
          {status === "completed" ? (
            <Check className="h-5 w-5" />
          ) : (
            <div>{order}</div>
          )}
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {isActive && (
        <Button asChild className="w-full mt-2">
          <Link href={`/unit/${id}`}>
            Continue Unit
          </Link>
        </Button>
      )}
    </div>
  );
};
