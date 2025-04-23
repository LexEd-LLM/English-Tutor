import { neon, neonConfig } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import * as fs from 'fs';
import * as path from 'path';

// Configure neon to use SSL
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql as any, { schema });

interface BookContent {
  Pronunciation: string;
  Vocabulary: string;
  Grammar: string;
  Reading: string;
  Speaking: string;
  Listening: string;
  Writing: string;
  "Everyday English": string;
  "Culture / CLIL": string;
  Project: string;
}

interface BookmapUnit {
  chunk_id: string;
  unit_number: number;
  unit_title: string;
  pages: string;
  content: BookContent;
  metadata: {
    source_pages: number[];
  };
}

interface VocabUnit {
  id: string;
  unit: string;
  section: string;
  type: string;
  content: string;
  metadata: {
    page: string;
    chunk_type: string;
  };
}

interface TextContentUnit {
  id: string;
  unit: string; // e.g. "unit_1"
  type: string; // "text_content"
  content: string;
}

const formatUnitTitle = (unitNumber: number, title: string): string => {
  const formattedTitle = title.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
  return `Unit ${unitNumber}: ${formattedTitle}`;
};

const main = async () => {
  try {
    console.log("Starting database seeding...");

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined");
    }
    console.log("Database URL:", process.env.DATABASE_URL);

    console.log("Deleting existing data...");
    await db.delete(schema.unitContents);
    await db.delete(schema.units);
    await db.delete(schema.curriculums);
    console.log("Existing data deleted successfully");

    const baseDir = path.join(process.cwd(), '..', 'database', 'book_content');

    const bookmapData = JSON.parse(fs.readFileSync(path.join(baseDir, 'unit_bookmap.json'), 'utf8')) as BookmapUnit[];
    const vocabData = JSON.parse(fs.readFileSync(path.join(baseDir, 'unit_vocab.json'), 'utf8')) as VocabUnit[];

    const allFiles = fs.readdirSync(baseDir);
    const textContentFiles = allFiles.filter(filename => /^unit\d+_text_content\.json$/.test(filename));
    const textContentData: TextContentUnit[] = textContentFiles.flatMap(filename => {
      const fullPath = path.join(baseDir, filename);
      return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as TextContentUnit[];
    });

    const [curriculum] = await db.insert(schema.curriculums).values({
      title: "English 12",
      description: "SGK Tiếng Anh 12 Global Success",
      image_url: "en-12-global-success-cover.png",
    }).returning();
    console.log("Curriculum inserted:", curriculum);

    console.log("Inserting units and contents...");
    for (const bookmap of bookmapData) {
      console.log(`\nProcessing unit ${bookmap.unit_number}:`);
      const vocab = vocabData.find(v => v.id === bookmap.chunk_id);

      if (!vocab) {
        console.warn(`Warning: No vocabulary found for unit ${bookmap.chunk_id}`);
        continue;
      }

      const [unit] = await db.insert(schema.units).values({
        curriculumId: curriculum.id,
        title: formatUnitTitle(bookmap.unit_number, bookmap.unit_title),
        order: bookmap.unit_number,
      }).returning();

      await db.insert(schema.unitContents).values({
        unitId: unit.id,
        type: "BOOKMAP",
        content: JSON.stringify(bookmap.content),
        order: 1,
      });

      await db.insert(schema.unitContents).values({
        unitId: unit.id,
        type: "VOCABULARY",
        content: vocab.content,
        order: 2,
      });

      const matchingTextChunks = textContentData.filter(t => t.unit === `unit_${bookmap.unit_number}`);

      for (const [index, chunk] of matchingTextChunks.entries()) {
        await db.insert(schema.unitContents).values({
          unitId: unit.id,
          type: "TEXT_CONTENT",
          content: chunk.content,
          order: 3 + index,
        });
      }

      console.log(`Unit ${bookmap.unit_number} and its contents inserted successfully`);
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw new Error("Failed to seed database");
  }
};

void main();