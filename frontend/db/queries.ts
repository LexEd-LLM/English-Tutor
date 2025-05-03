import { cache } from "react";
import { auth } from "@clerk/nextjs";
import { eq, desc, and } from "drizzle-orm";
import db from "./drizzle";
import {
  units,
  userCurriculumProgress,
  userQuizzes,
  curriculums,
  userUnitProgress,
  users,
  quizQuestions,
  unitContents,
} from "./schema";

import type { InferSelectModel } from "drizzle-orm";

// Quiz types from API
interface ChallengeOption {
  id: number;
  text: string;
  correct: boolean;
  imageSrc: string | null;
  audioSrc: string | null;
}

interface BaseQuestion {
  id: number;
  question: string;
  type: "FILL_IN_BLANK" | "TRANSLATION" | "IMAGE" | "VOICE";
  challengeOptions: ChallengeOption[];
  explanation?: string;
}

interface ImageQuestion extends BaseQuestion {
  imageUrl: string;
}

interface VoiceQuestion extends BaseQuestion {
  audioUrl: string;
}

type APIQuizQuestion = BaseQuestion | ImageQuestion | VoiceQuestion;

// Local type definitions to avoid conflicts
type UnitType = InferSelectModel<typeof units>;
type QuizQuestionType = InferSelectModel<typeof quizQuestions>;

export type Unit = InferSelectModel<typeof units>;
export type UserQuiz = InferSelectModel<typeof userQuizzes>;
export type QuizQuestion = InferSelectModel<typeof quizQuestions>;

export const getCurriculums = cache(async () => {
  const data = await db.query.curriculums.findMany();
  return data;
});

export const getUserProgress = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  // Get user progress and user data
  const [progress, user] = await Promise.all([
    db.query.userCurriculumProgress.findFirst({
      where: eq(userCurriculumProgress.userId, userId),
      with: {
        curriculum: true,
      },
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        hearts: true,
        activeCourseId: true
      },
    })
  ]);

  if (!progress || !user) return null;

  return {
    ...progress,
    hearts: user.hearts,
    activeCourseId: user.activeCourseId
  };
});

export const getCourses = cache(async () => {
  const data = await db.query.curriculums.findMany();

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.curriculumId) return [];

  const allUnits = await db.query.units.findMany({
    where: eq(units.curriculumId, userProgress.curriculumId),
    orderBy: (units, { asc }) => [asc(units.order)],
  });

  const completedUnits = await db.query.userUnitProgress.findMany({
    where: eq(userUnitProgress.userId, userId),
  });

  const completedUnitIds = new Set(completedUnits.map(u => u.unitId));

  return allUnits.map(unit => ({
    ...unit,
    completed: completedUnitIds.has(unit.id)
  }));
});

export const getCurriculumById = cache(async (curriculumId: number) => {
  const data = await db.query.curriculums.findFirst({
    where: eq(curriculums.id, curriculumId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
      },
    },
  });

  return data;
});

export const getCurriculumProgress = cache(async () => {
  const { userId } = auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.curriculumId) return null;

  // Get all units in the curriculum
  const allUnits = await db.query.units.findMany({
    where: eq(units.curriculumId, userProgress.curriculumId),
    orderBy: (units, { asc }) => [asc(units.order)],
  });

  // Get completed units
  const completedUnits = await db.query.userUnitProgress.findMany({
    where: eq(userUnitProgress.userId, userId),
  });

  const completedUnitIds = new Set(completedUnits.map(u => u.unitId));

  // Find first incomplete unit
  const firstIncompleteUnit = allUnits.find(unit => !completedUnitIds.has(unit.id));

  return {
    activeUnit: firstIncompleteUnit || allUnits[0],
    activeUnitId: firstIncompleteUnit?.id || allUnits[0]?.id,
    progressPercent: userProgress.progressPercent,
  };
});

export const getCourseById = cache(async (curriculumId: number) => {
  const data = await db.query.curriculums.findFirst({
    where: eq(curriculums.id, curriculumId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          contents: {
            orderBy: (unitContents, { asc }) => [asc(unitContents.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const { userId } = auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.curriculumId) return null;

  const allUnits = await db.query.units.findMany({
    where: eq(units.curriculumId, userProgress.curriculumId),
    orderBy: (units, { asc }) => [asc(units.order)],
  });

  // Get all quizzes completed by user for this curriculum's units
  const userQuizzesData = await db.query.userQuizzes.findMany({
    where: eq(userQuizzes.userId, userId),
    with: {
      questions: true,
    }
  });

  // Find first unit that doesn't have a completed quiz
  const firstIncompleteUnit = allUnits.find((unit: UnitType) => {
    return !userQuizzesData.some(quiz => 
      quiz.questions.some(question => 
        question.questionText.includes(`Unit ${unit.order}`)
      )
    );
  });

  return {
    activeUnit: firstIncompleteUnit || allUnits[0],
    activeUnitId: firstIncompleteUnit?.id || allUnits[0]?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = auth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const unitId = id || courseProgress?.activeUnitId;

  if (!unitId) return null;

  const data = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    with: {
      contents: {
        orderBy: (unitContents, { asc }) => [asc(unitContents.order)],
      },
    },
  });

  if (!data || !data.contents) return null;

  // Get user progress for this unit
  const userProgress = await db.query.userUnitProgress.findFirst({
    where: and(
      eq(userUnitProgress.userId, userId),
      eq(userUnitProgress.unitId, unitId)
    ),
  });

  const contents = data.contents.map(content => ({
    ...content,
    completed: false // We'll implement content completion tracking later
  }));

  return {
    ...data,
    contents,
    completed: !!userProgress,
  };
});

export const getLessonPercentage = cache(async () => {
  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeUnitId) return 0;

  const lesson = await getLesson(courseProgress?.activeUnitId);

  if (!lesson) return 0;

  const completedContents = lesson.contents.filter(
    (content) => content.completed
  );

  const percentage = Math.round(
    (completedContents.length / lesson.contents.length) * 100
  );

  return percentage;
});

export const getUserSubscription = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      role: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  });

  if (!user) return null;

  // VIP users always have active subscription
  if (user.role === "VIP" || user.role === "ADMIN") {
    return {
      isActive: true,
      isLifetime: true,
    };
  }

  // Check if subscription is still active
  if (user.subscriptionStatus === "VIP" && user.subscriptionEndDate) {
    const isActive = user.subscriptionEndDate.getTime() > Date.now();
    return {
      isActive,
      isLifetime: false,
      endDate: user.subscriptionEndDate,
    };
  }

  return {
    isActive: false,
    isLifetime: false,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = auth();

  if (!userId) return [];

  const data = await db.query.userCurriculumProgress.findMany({
    orderBy: (progress, { desc }) => [desc(progress.progressPercent)],
    limit: 10,
    with: {
      user: {
        columns: {
          name: true,
          imageSrc: true,
        }
      }
    }
  });

  return data.map(progress => ({
    userId: progress.userId,
    userName: progress.user.name,
    userImageSrc: progress.user.imageSrc,
    progressPercent: progress.progressPercent
  }));
});

export const getUserQuizzes = cache(async () => {
  const { userId } = auth();

  if (!userId) return [];

  const quizzes = await db.query.userQuizzes.findMany({
    where: eq(userQuizzes.userId, userId),
    with: {
      unit: {
        with: {
          curriculum: true
        }
      },
      questions: true,
    },
    orderBy: (userQuizzes, { desc }) => [desc(userQuizzes.createdAt)],
  });

  return quizzes;
});

export const getUserQuizQuestions = async () => {
  const { userId } = auth();

  if (!userId) {
    console.error("No user ID found");
    return null;
  }

  try {
    const quiz = await db.query.userQuizzes.findFirst({
      where: eq(userQuizzes.userId, userId),
      orderBy: [desc(userQuizzes.createdAt)],
      with: {
        questions: true,
      },
    });

    if (!quiz) {
      console.log("No quiz found for user");
      return null;
    }

    return quiz.questions;
  } catch (error) {
    console.error("Error retrieving quiz:", error);
    return null;
  }
};

export const updateUserProgress = async (userId: string, curriculumId: number) => {
  const completedUnits = await db.query.userUnitProgress.findMany({
    where: eq(userUnitProgress.userId, userId),
  });

  const allUnits = await db.query.units.findMany({
    where: eq(units.curriculumId, curriculumId),
  });

  const completedUnitIds = new Set(completedUnits.map(u => u.unitId));
  const totalUnits = allUnits.length;
  const completedCount = allUnits.filter(unit => completedUnitIds.has(unit.id)).length;
  const progressPercent = Math.round((completedCount / totalUnits) * 100);

  await db
    .insert(userCurriculumProgress)
    .values({
      userId,
      curriculumId,
      progressPercent,
    })
    .onConflictDoUpdate({
      target: [userCurriculumProgress.userId, userCurriculumProgress.curriculumId],
      set: {
        progressPercent,
      },
    });
};

export const updateUserCurriculumProgress = async (userId: string, curriculumId: number) => {
  try {
    // Get total units in curriculum
    const totalUnits = await db.query.units.findMany({
      where: eq(units.curriculumId, curriculumId),
    });

    // Get completed units
    const completedUnits = await db.query.userUnitProgress.findMany({
      where: and(
        eq(userUnitProgress.userId, userId),
        eq(units.curriculumId, curriculumId)
      ),
    });

    // Calculate progress percentage
    const progressPercent = Math.round(
      (completedUnits.length / totalUnits.length) * 100
    );

    // Update progress
    await db
      .update(userCurriculumProgress)
      .set({ progressPercent })
      .where(
        and(
          eq(userCurriculumProgress.userId, userId),
          eq(userCurriculumProgress.curriculumId, curriculumId)
        )
      );

    return true;
  } catch (error) {
    console.error("[UPDATE_CURRICULUM_PROGRESS]", error);
    return false;
  }
};

export const getUserHearts = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      hearts: true,
      imageSrc: true,
    },
  });

  if (!user) return null;

  return {
    hearts: user.hearts,
    imageSrc: user.imageSrc,
  };
});

export const getQuizById = cache(async (quizId: number) => {
  const { userId } = auth();

  if (!userId) return null;

  const quiz = await db.query.userQuizzes.findFirst({
    where: and(
      eq(userQuizzes.id, quizId),
      eq(userQuizzes.userId, userId)
    ),
    with: {
      questions: true,
      unit: {
        with: {
          curriculum: true
        }
      }
    },
  });

  return quiz;
});

export const getUsersWithRoles = cache(async () => {
  const data = await db.query.users.findMany({
    columns: {
      id: true,
      name: true,
      imageSrc: true,
      role: true,
      hearts: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  });

  return data;
});
