"use client";
import { useState } from "react";

import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { links } from "@/config";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { isSignedIn } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Only show content after component mounts on client
  useState(() => {
    setIsMounted(true);
  });

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <header className="h-20 w-full border-b-2 border-slate-200 px-4">
        <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
          <div className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
            <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />
            <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
              Lingo
            </h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-20 w-full border-b-2 border-slate-200 px-4">
      <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
        <Link href="/" className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />
          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            Lingo
          </h1>
        </Link>

        <div className="flex gap-x-3">
          <ClerkLoading>
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </ClerkLoading>
          <ClerkLoaded>
            <SignedIn>
              <div className="flex items-center gap-x-4">
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex items-center gap-x-4">
                <SignInButton
                  mode="modal"
                  afterSignInUrl="/learn"
                  afterSignUpUrl="/learn"
                >
                  <Button size="lg" variant="ghost">
                    Login
                  </Button>
                </SignInButton>
              </div>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
};
