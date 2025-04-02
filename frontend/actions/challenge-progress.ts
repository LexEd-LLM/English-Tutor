"use server";

import { auth } from "@clerk/nextjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { challengeProgress, challenges, userProgress } from "@/db/schema";

export const upsertChallengeProgress = async (challengeId: number) => {
  const { userId } = auth();
  console.log("Updating progress for user:", userId, "challenge:", challengeId);

  if (!userId) throw new Error("Unauthorized.");

  try {
    // Get current user progress
    const currentUserProgress = await getUserProgress();
    console.log("Current user progress:", currentUserProgress);
    
    if (!currentUserProgress) throw new Error("User progress not found.");

    const userSubscription = await getUserSubscription();
    console.log("User subscription:", userSubscription);

    // Find challenge and its progress
    console.log("Finding challenge:", challengeId);
    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
      with: {
        challengeProgress: {
          where: eq(challengeProgress.userId, userId),
        },
      },
    });
    console.log("Found challenge:", challenge);

    if (!challenge) {
      console.error("Challenge not found in database:", challengeId);
      // Instead of throwing error, return error object
      return { error: "challenge_not_found" };
    }

    const lessonId = challenge.lessonId;
    const existingProgress = challenge.challengeProgress?.[0];
    console.log("Existing progress:", existingProgress);

    // If this is practice (already completed before)
    if (existingProgress) {
      if (!existingProgress.completed) {
        console.log("Updating existing progress");
        await db.update(challengeProgress)
          .set({ completed: true })
          .where(eq(challengeProgress.id, existingProgress.id));

        await db.update(userProgress)
          .set({
            hearts: Math.min(currentUserProgress.hearts + 1, MAX_HEARTS),
            points: currentUserProgress.points + 10,
          })
          .where(eq(userProgress.userId, userId));
      }
    } else {
      // First time completing this challenge
      if (currentUserProgress.hearts === 0 && !userSubscription?.isActive) {
        return { error: "hearts" };
      }

      console.log("Creating new progress");
      await db.insert(challengeProgress).values({
        challengeId,
        userId,
        completed: true,
      });

      await db.update(userProgress)
        .set({
          points: currentUserProgress.points + 10,
        })
        .where(eq(userProgress.userId, userId));
    }

    // Revalidate paths
    revalidatePath("/learn");
    revalidatePath("/lesson");
    revalidatePath("/quests");
    revalidatePath("/leaderboard");
    revalidatePath(`/lesson/${lessonId}`);

    console.log("Successfully updated progress");
    return { success: true };
  } catch (error) {
    console.error("Error updating challenge progress:", error);
    return { error: "update_failed", details: error };
  }
};
