import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { users, curriculums, units, unitContents, userQuizzes, quizQuestions } from "@/db/schema";

export async function GET() {
  try {
    // Get table statistics
    const [
      usersCount,
      curriculumsCount,
      unitsCount,
      unitContentsCount,
      quizzesCount,
      questionsCount,
    ] = await Promise.all([
      db.select({ count: db.fn.count() }).from(users),
      db.select({ count: db.fn.count() }).from(curriculums),
      db.select({ count: db.fn.count() }).from(units),
      db.select({ count: db.fn.count() }).from(unitContents),
      db.select({ count: db.fn.count() }).from(userQuizzes),
      db.select({ count: db.fn.count() }).from(quizQuestions),
    ]);

    const tables = [
      {
        name: "users",
        records: Number(usersCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "text", nullable: false },
          { name: "name", type: "text", nullable: false },
          { name: "imageSrc", type: "text", nullable: false },
          { name: "role", type: "enum", nullable: false },
          { name: "hearts", type: "integer", nullable: false },
          { name: "subscriptionStatus", type: "enum", nullable: false },
        ],
      },
      {
        name: "curriculums",
        records: Number(curriculumsCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "serial", nullable: false },
          { name: "title", type: "text", nullable: false },
          { name: "description", type: "text", nullable: true },
          { name: "image_url", type: "text", nullable: true },
        ],
      },
      {
        name: "units",
        records: Number(unitsCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "serial", nullable: false },
          { name: "curriculumId", type: "integer", nullable: false },
          { name: "title", type: "text", nullable: false },
          { name: "order", type: "integer", nullable: false },
        ],
      },
      {
        name: "unit_contents",
        records: Number(unitContentsCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "serial", nullable: false },
          { name: "unitId", type: "integer", nullable: false },
          { name: "type", type: "enum", nullable: false },
          { name: "content", type: "text", nullable: false },
          { name: "order", type: "integer", nullable: false },
        ],
      },
      {
        name: "user_quizzes",
        records: Number(quizzesCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "serial", nullable: false },
          { name: "userId", type: "text", nullable: false },
          { name: "unitId", type: "integer", nullable: false },
          { name: "prompt", type: "text", nullable: false },
          { name: "strengths", type: "text", nullable: true },
          { name: "weaknesses", type: "text", nullable: true },
          { name: "createdAt", type: "timestamp", nullable: false },
        ],
      },
      {
        name: "quiz_questions",
        records: Number(questionsCount[0].count),
        lastUpdated: new Date().toISOString(),
        columns: [
          { name: "id", type: "serial", nullable: false },
          { name: "quizId", type: "integer", nullable: false },
          { name: "questionText", type: "text", nullable: false },
          { name: "type", type: "enum", nullable: false },
          { name: "options", type: "json", nullable: false },
          { name: "correctAnswer", type: "text", nullable: false },
          { name: "explanation", type: "text", nullable: true },
          { name: "imageUrl", type: "text", nullable: true },
          { name: "audioUrl", type: "text", nullable: true },
        ],
      },
    ];

    return NextResponse.json(tables);
  } catch (error) {
    console.error("[DATABASE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, table } = await req.json();

    switch (action) {
      case "backup":
        // Implement backup logic here
        return NextResponse.json({ message: `Backup of ${table} completed` });

      case "optimize":
        // Implement optimize logic here
        return NextResponse.json({ message: `Optimized ${table} successfully` });

      case "truncate":
        // Implement truncate logic here
        // WARNING: Be very careful with this in production!
        return NextResponse.json({ message: `Truncated ${table} successfully` });

      default:
        return new NextResponse("Invalid action", { status: 400 });
    }
  } catch (error) {
    console.error("[DATABASE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 