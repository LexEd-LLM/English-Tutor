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

// Helper function to format unit title
const formatUnitTitle = (unitNumber: number, title: string): string => {
  // Convert to Title Case and trim any extra spaces
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

    // Delete existing data
    console.log("Deleting existing data...");
    await db.delete(schema.unitContents);
    await db.delete(schema.units);
    await db.delete(schema.curriculums);
    console.log("Existing data deleted successfully");

    // Read both bookmap and vocabulary data
    const bookmapPath = path.join(process.cwd(), '..', 'database', 'book_content', 'unit_bookmap.json');
    const vocabPath = path.join(process.cwd(), '..', 'database', 'book_content', 'unit_vocab.json');
    
    if (!fs.existsSync(bookmapPath)) {
      throw new Error(`Bookmap file not found at ${bookmapPath}`);
    }
    if (!fs.existsSync(vocabPath)) {
      throw new Error(`Vocabulary file not found at ${vocabPath}`);
    }

    const bookmapData = JSON.parse(fs.readFileSync(bookmapPath, 'utf8')) as BookmapUnit[];
    const vocabData = JSON.parse(fs.readFileSync(vocabPath, 'utf8')) as VocabUnit[];

    // Insert curriculum (English textbook)
    console.log("Inserting curriculum...");
    const [curriculum] = await db
      .insert(schema.curriculums)
      .values({
        title: "English 12",
        description: "SGK Tiếng Anh 12 Global Success",
        image_url: "en-12-global-success-cover.png",
      })
      .returning();
    console.log("Curriculum inserted:", curriculum);

    // Insert units and their contents
    console.log("Inserting units and contents...");
    for (const bookmap of bookmapData) {
      console.log(`\nProcessing unit ${bookmap.unit_number}:`);
      console.log("Bookmap data:", {
          chunk_id: bookmap.chunk_id,
          unit_number: bookmap.unit_number,
          title: bookmap.unit_title,
          content_keys: JSON.stringify(bookmap.content),
      });
      
      // Find matching vocab data
      const vocab = vocabData.find(v => v.id === bookmap.chunk_id);
      
      if (!vocab) {
        console.warn(`Warning: No vocabulary found for unit ${bookmap.chunk_id}`);
        continue;
      }

      // Insert unit first
      const [unit] = await db
        .insert(schema.units)
        .values({
          curriculumId: curriculum.id,
          title: formatUnitTitle(bookmap.unit_number, bookmap.unit_title),
          order: bookmap.unit_number,
        })
        .returning();

      // Insert bookmap content
      await db.insert(schema.unitContents).values({
        unitId: unit.id,
        type: "BOOKMAP",
        content: JSON.stringify(bookmap.content),
        order: 1,
      });

      // Insert vocabulary content
      await db.insert(schema.unitContents).values({
        unitId: unit.id,
        type: "VOCABULARY",
        content: vocab.content,
        order: 2,
      });

      console.log(`Unit ${bookmap.unit_number} and its contents inserted successfully`);
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw new Error("Failed to seed database");
  }
};

void main();
