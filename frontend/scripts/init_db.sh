#!/bin/bash
rm -rf drizzle/
# Run drizzle-kit from project root
npx drizzle-kit generate:pg

# Run tsx scripts from project root
npx tsx scripts/push-schema.ts
npx tsx scripts/seed.ts
