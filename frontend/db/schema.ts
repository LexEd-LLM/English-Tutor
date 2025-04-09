import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  json,
} from "drizzle-orm/pg-core";

import { MAX_HEARTS } from "@/constants";

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Unit 1
  description: text("description").notNull(), // Learn the basics of spanish
  courseId: integer("course_id")
    .references(() => courses.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  unitId: integer("unit_id")
    .references(() => units.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id")
    .references(() => lessons.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: challengesEnum("type").notNull(),
  question: text("question").notNull(),
  order: integer("order").notNull(),
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
}));

export const challengeOptions = pgTable("challenge_options", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  text: text("text").notNull(),
  correct: boolean("correct").notNull(),
  imageSrc: text("image_src"),
  audioSrc: text("audio_src"),
});

export const challengeOptionsRelations = relations(
  challengeOptions,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeOptions.challengeId],
      references: [challenges.id],
    }),
  })
);

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const challengeProgressRelations = relations(
  challengeProgress,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeProgress.challengeId],
      references: [challenges.id],
    }),
  })
);

export const userRoleEnum = pgEnum("role", ["USER", "VIP", "ADMIN"]);

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("User"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  hearts: integer("hearts").notNull().default(MAX_HEARTS),
  points: integer("points").notNull().default(0),
  role: userRoleEnum("role").notNull().default("USER"),
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});

// Bảng lưu trữ câu hỏi quiz của người dùng
export const userQuizStorage = pgTable("user_quiz_storage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  questions: json("questions").notNull(), // Lưu trữ dưới dạng JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bảng lưu trữ tài nguyên hình ảnh
export const quizImages = pgTable("quiz_images", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => userQuizStorage.id, {
    onDelete: "cascade",
  }).notNull(),
  imageUrl: text("image_url").notNull(),
  imageDescription: text("image_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bảng lưu trữ tài nguyên âm thanh
export const quizAudios = pgTable("quiz_audios", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => userQuizStorage.id, {
    onDelete: "cascade",
  }).notNull(),
  audioUrl: text("audio_url").notNull(),
  word: text("word").notNull(), // Từ cần phát âm
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userQuizStorageRelations = relations(userQuizStorage, ({ one, many }) => ({
  user: one(userProgress, {
    fields: [userQuizStorage.userId],
    references: [userProgress.userId],
  }),
  images: many(quizImages),
  audios: many(quizAudios),
}));

export const quizImagesRelations = relations(quizImages, ({ one }) => ({
  quiz: one(userQuizStorage, {
    fields: [quizImages.quizId],
    references: [userQuizStorage.id],
  }),
}));

export const quizAudiosRelations = relations(quizAudios, ({ one }) => ({
  quiz: one(userQuizStorage, {
    fields: [quizAudios.quizId],
    references: [userQuizStorage.id],
  }),
}));

// Bảng lưu trữ giải thích cho câu hỏi
export const explanations = pgTable("explanations", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(), // ID của câu hỏi trong userQuizStorage.questions
  userId: text("user_id").notNull(),
  explanation: text("explanation").notNull(),
  userAnswer: text("user_answer"), // Đáp án người dùng đã chọn
  correctAnswer: text("correct_answer").notNull(), // Đáp án đúng
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const explanationsRelations = relations(explanations, ({ one }) => ({
  user: one(userProgress, {
    fields: [explanations.userId],
    references: [userProgress.userId],
  }),
}));
