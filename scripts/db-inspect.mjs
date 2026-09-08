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

const tables = await sql`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'quizper_%'`;
console.log("tables:", tables.map((t) => t.tablename).join(", "));

for (const { tablename } of tables) {
  const pk = await sql`
    SELECT kcu.column_name FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = ${tablename} AND tc.constraint_type = 'PRIMARY KEY'`;
  console.log(tablename, "-> PK:", pk.map((r) => r.column_name).join(", ") || "NONE");
}

const dupes = await sql`
  SELECT "quizSlug", name, COUNT(*) FROM quizper_candidate_rating
  GROUP BY 1, 2 HAVING COUNT(*) > 1`;
console.log("duplicate (quiz_slug, name):", dupes.length);
