// seeder.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import { getUnitNumberFromId } from "./utils";
import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/neon-http";

// Configure neon to use SSL
neonConfig.fetchConnectionCache = true;
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql as any, { schema });

interface BookmapUnit {
  id: string;
  unit: string;
  type: "BOOKMAP";
  content: any;
}
interface VocabUnit {
  id: string;
  unit: string;
  type: "VOCABULARY";
  content: string;
}
interface TextContentUnit {
  id: string;
  unit: string;
  type: "TEXT_CONTENT";
  content: string;
}

export const seedClass = async (
  classFolder: string,
  curriculumId: number,
) => {
  const baseDir = path.join(
    process.cwd(),
    "..",
    "database",
    "book_content",
    classFolder
  );

  const bookmap: BookmapUnit[] =
    readJSONSafe(path.join(baseDir, "unit_bookmap.json")) || [];
  const vocab: VocabUnit[] =
    readJSONSafe(path.join(baseDir, "unit_vocab.json")) || [];

  const textContent: TextContentUnit[] = fs
    .readdirSync(baseDir)
    .filter((f) => /^unit\d+_text_content\.json$/.test(f))
    .flatMap((filename) => {
      const match = filename.match(/^unit(\d+)_text_content\.json$/);
      if (!match) return [];
  
      const unitId = `unit_${match[1]}`; // ví dụ: unit_1
  
      const entries = readJSONSafe(path.join(baseDir, filename)) || [];
      return entries.map((entry) => ({
        ...entry,
        unit: unitId,
      }));
    });

  // Dùng map để gom tất cả unit IDs có mặt
  const allUnitIds = new Set<string>();
  bookmap.forEach((b) => allUnitIds.add(b.id));
  vocab.forEach((v) => allUnitIds.add(v.id));

  for (const unitId of allUnitIds) {
    const unitOrder = getUnitNumberFromId(unitId) ?? 0;

    // Ưu tiên lấy tiêu đề unit từ bookmap, fallback về vocab
    const bookmapUnit = bookmap.find((b) => b.id === unitId);
    const vocabUnit = vocab.find((v) => v.id === unitId);

    const unitTitle = bookmapUnit?.unit || vocabUnit?.unit || `Unit ${unitOrder}`;

    const [unitRow] = await db
      .insert(schema.units)
      .values({
        curriculumId,
        title: unitTitle,
        order: unitOrder,
      })
      .returning();

    if (bookmapUnit) {
      await db.insert(schema.unitContents).values({
        unitId: unitRow.id,
        type: "BOOKMAP",
        content: JSON.stringify(bookmapUnit.content),
        order: 1,
      });
    }

    if (vocabUnit) {
      await db.insert(schema.unitContents).values({
        unitId: unitRow.id,
        type: "VOCABULARY",
        content: vocabUnit.content,
        order: 2,
      });
    }

    const relatedChunks = textContent.filter((t) => t.unit === unitId);
    for (const [index, chunk] of relatedChunks.entries()) {
      if (chunk.content.trim()) {
        await db.insert(schema.unitContents).values({
          unitId: unitRow.id,
          type: "TEXT_CONTENT",
          content: chunk.content,
          order: 3 + index,
        });
      }
    }
  }
};

function readJSONSafe(filePath: string): any[] | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch (e) {
    if (e instanceof Error) {
      console.warn(`Skipping file ${filePath}: ${e.message}`);
    } else {
      console.warn(`Skipping file ${filePath}: Unknown error`);
    }
    return null;
  }
}
