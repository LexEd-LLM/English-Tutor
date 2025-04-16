"use server";

import { auth } from "@clerk/nextjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MAX_HEARTS } from "@/constants";
import db from "@/db/drizzle";
import { getUserProgress, getUserSubscription } from "@/db/queries";
import { userAnswers, quizQuestions, users } from "@/db/schema";

export const upsertChallengeProgress = async (questionId: number) => {
  const { userId } = auth();
  console.log("Updating progress for user:", userId, "question:", questionId);

  if (!userId) throw new Error("Unauthorized.");

  try {
    // Get current user progress
    const currentUserProgress = await getUserProgress();
    console.log("Current user progress:", currentUserProgress);
    
    if (!currentUserProgress) throw new Error("User progress not found.");

    const userSubscription = await getUserSubscription();
    console.log("User subscription:", userSubscription);

    // Get current user hearts
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        hearts: true,
      },
    });

    if (!user) throw new Error("User not found");

    // Find question and user's answer
    console.log("Finding question:", questionId);
    const question = await db.query.quizQuestions.findFirst({
      where: eq(quizQuestions.id, questionId),
      with: {
        quiz: true,
      },
    });
    console.log("Found question:", question);

    if (!question) {
      console.error("Question not found in database:", questionId);
      return { error: "question_not_found" };
    }

    // Check if user has already answered this question
    const existingAnswer = await db.query.userAnswers.findFirst({
      where: and(
        eq(userAnswers.userId, userId),
        eq(userAnswers.questionId, questionId)
      ),
    });
    console.log("Existing answer:", existingAnswer);

    // If this is practice (already answered before)
    if (existingAnswer) {
      if (!existingAnswer.isCorrect) {
        console.log("Updating existing answer");
        await db.update(userAnswers)
          .set({ isCorrect: true })
          .where(eq(userAnswers.id, existingAnswer.id));

        // Add hearts for correct answer in practice mode
        await db.update(users)
          .set({
            hearts: Math.min(user.hearts + 1, MAX_HEARTS),
          })
          .where(eq(users.id, userId));
      }
    } else {
      // First time answering this question
      if (currentUserProgress.hearts === 0 && !userSubscription?.isActive) {
        return { error: "hearts" };
      }

      console.log("Creating new answer");
      await db.insert(userAnswers).values({
        userId,
        questionId,
        userAnswer: "correct", // You may want to pass the actual user answer
        isCorrect: true,
      });

      // Update user hearts if not VIP
      if (!userSubscription?.isActive) {
        await db.update(users)
          .set({
            hearts: Math.max(user.hearts - 1, 0),
          })
          .where(eq(users.id, userId));
      }
    }

    // Revalidate paths
    revalidatePath("/learn");
    revalidatePath("/lesson");
    revalidatePath("/quests");
    revalidatePath("/leaderboard");
    revalidatePath(`/lesson/${question.quiz.unitId}`);

    console.log("Successfully updated progress");
    return { success: true };
  } catch (error) {
    console.error("Error updating question progress:", error);
    return { error: "update_failed", details: error };
  }
};
