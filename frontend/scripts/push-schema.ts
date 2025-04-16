import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon, neonConfig } from "@neondatabase/serverless";
import "dotenv/config";

// Configure neon to use SSL
neonConfig.fetchConnectionCache = true;

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql as any);

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("Migrations completed!");
};

runMigration().catch((err) => {
  console.error("Error running migration:", err);
  process.exit(1);
}); 