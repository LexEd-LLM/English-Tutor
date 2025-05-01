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
  unique,
} from "drizzle-orm/pg-core";
import { InferSelectModel } from "drizzle-orm";

import { MAX_HEARTS } from "@/constants";

// Define enums first
export const roleEnum = pgEnum("role", ["USER", "VIP", "ADMIN"]);
export const unitContentTypeEnum = pgEnum("unit_content_type", ["BOOKMAP", "VOCABULARY", "TEXT_CONTENT"]);
export const questionTypeEnum = pgEnum("question_type", [
  "TEXT",
  "IMAGE",
  "VOICE",
  "PRONUNCIATION",
]);
export const dokLevelEnum = pgEnum("dok_level", ["RECALL", "SKILL_CONCEPT", "STRATEGIC_THINKING"]);

// Type definitions
export type Unit = InferSelectModel<typeof units>;
export type QuizQuestion = InferSelectModel<typeof quizQuestions>;
export type UnitContent = InferSelectModel<typeof unitContents>;

export type UserSubscription = {
  isActive: boolean;
  isLifetime?: boolean;
  endDate?: Date;
};

// users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("User"),
  imageSrc: text("image_src").notNull().default("/default-user.png"),
  role: roleEnum("role").notNull().default("USER"),
  hearts: integer("hearts").notNull().default(MAX_HEARTS),
  activeCourseId: integer("active_course_id")
  .references(() => curriculums.id, { onDelete: "set null" }), // cho phép null khi curriculum bị xóa
  subscriptionStatus: roleEnum("subscription_status").notNull().default("USER"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
});

// userCurriculumProgress - Track user's curriculum progress
export const userCurriculumProgress = pgTable("user_curriculum_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  curriculumId: integer("curriculum_id")
    .references(() => curriculums.id, { onDelete: "cascade" })
    .notNull(),
  progressPercent: integer("progress_percent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// user_unit_progress – Mỗi unit user đã tạo quiz cho
export const userUnitProgress = pgTable("user_unit_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  unitId: integer("unit_id")
    .references(() => units.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// curriculums – Giáo trình/Chương trình học
export const curriculums = pgTable("curriculums", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  image_url: text("image_url"),
});

// units – Mỗi chương trong một giáo trình
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  curriculumId: integer("curriculum_id")
    .references(() => curriculums.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
});

// unit_contents – Nội dung của một chương
export const unitContents = pgTable("unit_contents", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id")
    .references(() => units.id, { onDelete: "cascade" })
    .notNull(),
  type: unitContentTypeEnum("type").notNull(),
  content: text("content").notNull(), // hoặc json nếu cần cấu trúc phức tạp
  order: integer("order").notNull(), // dùng để sắp xếp hiển thị
});

// user_quizzes – Mỗi quiz do người dùng tạo
export const userQuizzes = pgTable("user_quizzes", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  unitId: integer("unit_id")
  .references(() => units.id, { onDelete: "cascade" })
  .notNull(),
  prompt: text("prompt"), // câu lệnh yêu cầu AI tạo quiz
  depthOfKnowledge: dokLevelEnum("depth_of_knowledge").array(),
  strengths: text("strengths"),      // điểm mạnh của user trong quiz
  weaknesses: text("weaknesses"),    // điểm yếu của user trong quiz
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// quiz_questions – Câu hỏi trong quiz do AI tạo
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .references(() => userQuizzes.id, { onDelete: "cascade" })
    .notNull(),
  questionText: text("question_text").notNull(),
  type: questionTypeEnum("type").notNull(),
  options: json("options"), // List of answers (QuizOption[]). Null for PRONUNCIATION
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  imageUrl: text("image_url"),     // Đường dẫn đến ảnh trong câu hỏi hình ảnh
  audioUrl: text("audio_url"),     // Đường dẫn đến audio trong câu hỏi phát âm
});

// userAnswers – Lịch sử trả lời của User
export const userAnswers = pgTable("user_answers", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").references(() => quizQuestions.id, { onDelete: "cascade" }).notNull(),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  userPhonemes: text("user_phonemes"), // nullable
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => ({
  userQuestionUnique: unique("user_question_unique").on(table.userId, table.questionId),
}));

// Relations
export const curriculumRelations = relations(curriculums, ({ many }) => ({
  units: many(units),
}));

export const unitRelations = relations(units, ({ one, many }) => ({
  curriculum: one(curriculums, {
    fields: [units.curriculumId],
    references: [curriculums.id],
  }),
  contents: many(unitContents),
}));

export const unitContentRelations = relations(unitContents, ({ one }) => ({
  unit: one(units, {
    fields: [unitContents.unitId],
    references: [units.id],
  }),
}));

export const userCurriculumProgressRelations = relations(userCurriculumProgress, ({ one }) => ({
  user: one(users, {
    fields: [userCurriculumProgress.userId],
    references: [users.id],
  }),
  curriculum: one(curriculums, {
    fields: [userCurriculumProgress.curriculumId],
    references: [curriculums.id],
  }),
}));

export const userQuizzesRelations = relations(userQuizzes, ({ one, many }) => ({
  user: one(users, {
    fields: [userQuizzes.userId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [userQuizzes.unitId],
    references: [units.id],
  }),
  questions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(userQuizzes, {
    fields: [quizQuestions.quizId],
    references: [userQuizzes.id],
  }),
}));

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  user: one(users, {
    fields: [userAnswers.userId],
    references: [users.id],
  }),
  question: one(quizQuestions, {
    fields: [userAnswers.questionId],
    references: [quizQuestions.id],
  }),
}));

export const userUnitProgressRelations = relations(userUnitProgress, ({ one }) => ({
  user: one(users, {
    fields: [userUnitProgress.userId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [userUnitProgress.unitId],
    references: [units.id],
  }),
}));

// QUAN HỆ GIỮA CÁC BẢNG
// users → userQuizzes → quizQuestions → userAnswers

// curriculums → units → unitContents

// quizQuestions chứa đầy đủ nội dung + media