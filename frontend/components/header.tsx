"use client";

import { ArrowLeft, Heart, InfinityIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { curriculums } from "@/db/schema";

interface HeaderProps {
  hearts: number;
  userImage?: string;
  activeCourse?: typeof curriculums.$inferSelect;
  showBackButton?: boolean;
  isVIP?: boolean;
}

export const Header = ({ 
  hearts, 
  userImage,
  activeCourse,
  showBackButton = true,
  isVIP = false,
}: HeaderProps) => {
  const router = useRouter();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 h-14 bg-white border-b z-50">
      <div className="flex h-full w-full">
        {/* Main content area - matches FeedWrapper width */}
        <div className="flex-1 flex items-center px-6">
          <div className="w-full max-w-3xl mx-auto flex items-center justify-between">
            {showBackButton && (
                <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => router.back()}
                >
                  <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400" />
                </Button>
            )}
            
            <h1 className="text-lg font-bold text-neutral-700">
              {activeCourse?.title || "Generate Quiz"}
            </h1>

            <div className="w-10" aria-hidden="true" /> {/* Spacer for alignment */}
          </div>
        </div>

        {/* Sidebar area - matches StickyWrapper width */}
        <div className="w-[368px] relative flex items-center justify-end px-6">
          {/* Heart - centered absolutely */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-x-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            {isVIP ? (
              <InfinityIcon className="h-6 w-6 shrink-0 stroke-[3] text-rose-500" />
            ) : (
              <span className="text-rose-500 font-bold">{hearts}</span>
            )}
          </div>

          {/* Avatar - stays on the right */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar>
                  <AvatarImage src={userImage} />
                  <AvatarFallback>Y</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link href="/quiz-history">Quiz History</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-500"
                onClick={async () => {
                  await signOut(() => {
                    window.location.href = "/";
                  });
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}; 