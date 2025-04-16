import { NextResponse } from "next/server";
import db from "@/db/drizzle";
import { curriculums, units, unitContents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Get all curriculums with their units and unit contents
    const data = await db.query.curriculums.findMany({
      with: {
        units: {
          with: {
            contents: true,
          },
          orderBy: (units, { asc }) => [asc(units.order)],
        },
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[QUIZ_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Update unit content status (you may need to add a status field to your schema)
    const updatedContent = await db
      .update(unitContents)
      .set({ status })
      .where(eq(unitContents.id, id))
      .returning();

    return NextResponse.json(updatedContent[0]);
  } catch (error) {
    console.error("[QUIZ_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return new NextResponse("ID and type required", { status: 400 });
    }

    const numericId = Number(id);

    switch (type) {
      case "curriculum":
        // Delete curriculum will cascade delete all related units and contents
        await db.delete(curriculums).where(eq(curriculums.id, numericId));
        break;

      case "unit":
        // Delete unit will cascade delete all related contents
        await db.delete(units).where(eq(units.id, numericId));
        break;

      case "content":
        // Delete single content
        await db.delete(unitContents).where(eq(unitContents.id, numericId));
        break;

      default:
        return new NextResponse("Invalid type", { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[QUIZ_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 