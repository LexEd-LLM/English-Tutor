import { cache } from "react";
import { auth } from "@clerk/nextjs";
import { eq, desc } from "drizzle-orm";
import db from "./drizzle";
import {
  challengeProgress,
  courses,
  lessons,
  units,
  userProgress,
  userSubscription,
  userQuizStorage,
  quizImages,
  quizAudios,
} from "./schema";
import { User } from "@/db/schema";
import { db as dbIndex } from "@/db/index";
import type { UserProgress } from "./schema";

const DAY_IN_MS = 86_400_000;

export const getCourses = cache(async () => {
  const data = await db.query.courses.findMany();

  return data;
});

export const getUserProgress = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            orderBy: (challenges, { asc }) => [asc(challenges.order)],
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const normalizedData = data.map((unit) => {
    const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
      if (lesson.challenges.length === 0)
        return { ...lesson, completed: false };

      const allCompletedChallenges = lesson.challenges.every((challenge) => {
        return (
          challenge.challengeProgress &&
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      });

      return { ...lesson, completed: allCompletedChallenges };
    });

    return { ...unit, lessons: lessonsWithCompletedStatus };
  });

  return normalizedData;
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
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

  if (!userId || !userProgress?.activeCourseId) return null;

  const unitsInActiveCourse = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          unit: true,
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const firstUncompletedLesson = unitsInActiveCourse
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      return lesson.challenges.some((challenge) => {
        return (
          !challenge.challengeProgress ||
          challenge.challengeProgress.length === 0 ||
          challenge.challengeProgress.some((progress) => !progress.completed)
        );
      });
    });

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = auth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) return null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  return { ...data, challenges: normalizedChallenges };
});

export const getLessonPercentage = cache(async () => {
  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeLessonId) return 0;

  const lesson = await getLesson(courseProgress?.activeLessonId);

  if (!lesson) return 0;

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );

  const percentage = Math.round(
    (completedChallenges.length / lesson.challenges.length) * 100
  );

  return percentage;
});

export const getUserSubscription = cache(async () => {
  const { userId } = auth();

  if (!userId) return null;

  const user = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
  });

  if (user?.role === "VIP" || user?.role === "ADMIN") {
    return {
      isActive: true,
    };
  }

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripeCurrentPeriodEnd.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = auth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
    },
  });

  return data;
});

interface QuizQuestion {
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  image_url?: string;
  image_description?: string;
  audio_url?: string;
}

export const getUserQuizQuestions = async () => {
  const { userId } = auth();

  if (!userId) {
    console.error("No user ID found");
    return null;
  }

  try {
    // Lấy quiz mới nhất của user
    const quiz = await db.query.userQuizStorage.findFirst({
      where: eq(userQuizStorage.userId, userId),
      orderBy: [desc(userQuizStorage.createdAt)],
      with: {
        images: true,
        audios: true,
      },
    });

    if (!quiz) {
      console.log("No quiz found for user");
      return null;
    }

    // Kết hợp câu hỏi với tài nguyên
    const questions = (quiz.questions as QuizQuestion[]).map((q) => {
      if (q.type === "image") {
        const imageResource = quiz.images.find(img => img.imageDescription === q.image_description);
        if (imageResource) {
          q.image_url = imageResource.imageUrl;
        }
      } else if (q.type === "voice") {
        const audioResource = quiz.audios.find(audio => audio.word === q.correct_answer);
        if (audioResource) {
          q.audio_url = audioResource.audioUrl;
        }
      }
      return q;
    });

    return questions;
  } catch (error) {
    console.error("Error retrieving quiz:", error);
    return null;
  }
};

export const setUserQuizQuestions = async (questions: QuizQuestion[]) => {
  const { userId } = auth();

  if (!userId) {
    console.error("No user ID found");
    return false;
  }

  try {
    // Lưu câu hỏi vào bảng quiz storage
    const [quiz] = await db
      .insert(userQuizStorage)
      .values({
        userId,
        questions,
      })
      .returning();

    if (!quiz) {
      console.error("Failed to insert quiz");
      return false;
    }

    // Lưu hình ảnh cho câu hỏi image
    const imageQuestions = questions.filter(q => q.type === "image");
    if (imageQuestions.length > 0) {
      await db.insert(quizImages).values(
        imageQuestions.map(q => ({
          quizId: quiz.id,
          imageUrl: q.image_url || "",
          imageDescription: q.image_description || "",
        }))
      );
    }

    // Lưu âm thanh cho câu hỏi voice
    const voiceQuestions = questions.filter(q => q.type === "voice");
    if (voiceQuestions.length > 0) {
      await db.insert(quizAudios).values(
        voiceQuestions.map(q => ({
          quizId: quiz.id,
          audioUrl: q.audio_url || "",
          word: q.correct_answer,
        }))
      );
    }

    return true;
  } catch (error) {
    console.error("Error storing quiz:", error);
    return false;
  }
};

export const getUsersWithRoles = cache(async () => {
  try {
    console.log("[QUERIES] Fetching users with roles");
    
    const result = await db.query.userProgress.findMany({
      orderBy: (progress, { desc }) => [desc(progress.points)],
    });

    console.log("[QUERIES] Found users:", result.length);

    return result.map((item) => ({
      id: item.userId,
      email: item.userName || "No Name",
      imageUrl: item.userImageSrc || "",
      role: item.role || "USER",
      points: item.points || 0,
      hearts: item.hearts || 0,
      createdAt: new Date(),
    }));
  } catch (error) {
    console.error("[QUERIES] Error fetching users:", error);
    return [];
  }
});
