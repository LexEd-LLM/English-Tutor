"use server";

import { auth, currentUser } from "@clerk/nextjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import db from "@/db/drizzle";
import {
  getCurriculumById,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { userCurriculumProgress, users } from "@/db/schema";

const createUserIfNotExists = async () => {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("Unauthorized");

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existingUser) {
    await db.insert(users).values({
      id: userId,
      name: user.firstName || "User",
      imageSrc: user.imageUrl || "/default-user.png",
    });
  }

  return existingUser || { id: userId };
};

export const upsertUserProgress = async (curriculumId: number) => {
  try {
    await createUserIfNotExists();
    
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) throw new Error("Unauthorized.");

    const curriculum = await getCurriculumById(curriculumId);

    if (!curriculum) throw new Error("Curriculum not found.");

    if (!curriculum.units.length)
      throw new Error("Curriculum is empty.");

    const existingUserProgress = await getUserProgress();

    if (existingUserProgress) {
      await db
        .update(userCurriculumProgress)
        .set({
          curriculumId,
          updatedAt: new Date(),
        })
        .where(eq(userCurriculumProgress.userId, userId));

      revalidatePath("/courses");
      revalidatePath("/learn");
    }

    await db.insert(userCurriculumProgress).values({
      userId,
      curriculumId,
      progressPercent: 0,
    });

    revalidatePath("/courses");
    revalidatePath("/learn");
  } catch (error) {
    console.error("Error in upsertUserProgress:", error);
    throw error;
  }
};

export const reduceHearts = async (questionId: number) => {
  const { userId } = auth();

  if (!userId) throw new Error("Unauthorized");

  try {
    const userProgress = await getUserProgress();
    const userSubscription = await getUserSubscription();

    if (!userProgress) {
      throw new Error("User progress not found");
    }

    // Don't reduce hearts for wrong answers anymore
    // Only track the wrong answer
    return { success: true };
  } catch (error) {
    return { error: "update_failed" };
  }
};

export const refillHearts = async () => {
  const currentUserProgress = await getUserProgress();

  if (!currentUserProgress) throw new Error("User progress not found.");

  await db
    .update(userCurriculumProgress)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(userCurriculumProgress.userId, currentUserProgress.userId));

  revalidatePath("/shop");
  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");
};
