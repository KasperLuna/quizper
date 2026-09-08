import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i), v];
    }),
);
const sql = neon(env.DATABASE_URL);

// Matches src/server/db/schema.ts: composite PK replaces the quizSlug index.
await sql`DROP INDEX IF EXISTS "candidate_rating_quiz_idx"`;
await sql`ALTER TABLE "quizper_candidate_rating" ADD PRIMARY KEY ("quizSlug", "name")`;
console.log("PK applied");

// Confirm desired-vs-actual match for future pushes.
const idx = await sql`
  SELECT indexname FROM pg_indexes WHERE tablename = 'quizper_candidate_rating'`;
console.log("indexes:", idx.map((r) => r.indexname).join(", "));
