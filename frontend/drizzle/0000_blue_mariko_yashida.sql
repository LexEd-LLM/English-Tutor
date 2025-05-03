DO $$ BEGIN
 CREATE TYPE "dok_level" AS ENUM('RECALL', 'SKILL_CONCEPT', 'STRATEGIC_THINKING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "question_type" AS ENUM('TEXT', 'IMAGE', 'VOICE', 'PRONUNCIATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "role" AS ENUM('USER', 'VIP', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "unit_content_type" AS ENUM('BOOKMAP', 'VOCABULARY', 'TEXT_CONTENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curriculums" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"lesson_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"type" "question_type" NOT NULL,
	"options" json,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"image_url" text,
	"audio_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unit_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"type" "unit_content_type" NOT NULL,
	"content" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"curriculum_id" integer NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" integer NOT NULL,
	"user_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"user_phonemes" text,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "user_question_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_curriculum_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"curriculum_id" integer NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"unit_id" integer NOT NULL,
	"title" text,
	"prompt" json,
	"depth_of_knowledge" dok_level[],
	"strengths" text,
	"weaknesses" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_unit_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"unit_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'User' NOT NULL,
	"image_src" text DEFAULT '/default-user.png' NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"hearts" integer DEFAULT 5 NOT NULL,
	"active_course_id" integer,
	"subscription_status" "role" DEFAULT 'USER' NOT NULL,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_user_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "user_quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unit_contents" ADD CONSTRAINT "unit_contents_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "units" ADD CONSTRAINT "units_curriculum_id_curriculums_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "curriculums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_curriculum_progress" ADD CONSTRAINT "user_curriculum_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_curriculum_progress" ADD CONSTRAINT "user_curriculum_progress_curriculum_id_curriculums_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "curriculums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_quizzes" ADD CONSTRAINT "user_quizzes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_quizzes" ADD CONSTRAINT "user_quizzes_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_unit_progress" ADD CONSTRAINT "user_unit_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_unit_progress" ADD CONSTRAINT "user_unit_progress_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_active_course_id_curriculums_id_fk" FOREIGN KEY ("active_course_id") REFERENCES "curriculums"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
