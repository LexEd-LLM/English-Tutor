import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { users } from "@/db/schema";
import { MAX_HEARTS } from "@/constants";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { action } = await req.json();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        hearts: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    let newHearts = user.hearts;

    if (action === "reduce") {
      newHearts = Math.max(user.hearts - 1, 0);
    } else if (action === "add") {
      newHearts = Math.min(user.hearts + 1, MAX_HEARTS);
    }

    await db.update(users)
      .set({ hearts: newHearts })
      .where(eq(users.id, userId));

    return NextResponse.json({ hearts: newHearts });
  } catch (error) {
    console.error("[HEARTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 