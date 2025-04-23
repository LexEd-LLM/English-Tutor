// seed.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { seedClass } from "./seeder";

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql as any, { schema });

const main = async () => {
  try {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is not defined");

    console.log("Clearing old data...");
    await db.delete(schema.unitContents);
    await db.delete(schema.units);
    await db.delete(schema.curriculums);
    console.log("Database cleared.");

    const classes = Array.from({ length: 12 }, (_, i) => `class_${i + 1}`);

    for (const className of classes) {
      console.log(`\n=== Seeding ${className} ===`);
      const curriculum = await db
        .insert(schema.curriculums)
        .values({
          title: `English ${className.split("_")[1]}`,
          description: `SGK Tiếng Anh ${className.split("_")[1]} Global Success`,
          image_url: `book_covers/en-${className.split("_")[1]}-global-success-cover.png`,
        })
        .returning()
        .then((r) => r[0]);

      await seedClass(className, curriculum.id);
    }

    console.log("\nAll classes seeded successfully.");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

void main();
