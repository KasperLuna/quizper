/**
 * Seeds Unidata versus quizzes from a names file (JSON with // comments).
 * Each quiz = one pairwise question holding all names (versus type).
 * Skips slugs that already exist.
 * Usage: node scripts/seed-unidata-quizzes.mjs [path/to/names.json]
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i), v];
    }),
);

const SPACE = env.CONTENTFUL_SPACE_ID;
const TOKEN = env.CONTENTFUL_MANAGEMENT_TOKEN;
const CDA = env.CONTENTFUL_ACCESS_TOKEN;
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/master`;
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/vnd.contentful.management.v1+json",
};

const namesPath =
  process.argv[2] ??
  "/Users/kasperluna/.paseo/uploads/upload_9ef161f9-1003-4ee9-961b-7bfdc59bd1cd/unidata-members.json";
const names = readFileSync(namesPath, "utf8")
  .split("\n")
  .map((l) => l.replace(/\/\/.*$/, "").trim())
  .filter((l) => l && !["[", "]"].includes(l))
  .map((l) => l.replace(/,$/, "").trim().replace(/^"|"$/g, ""))
  .filter(Boolean);
console.log(`${names.length} names`);

const L = (v) => ({ "en-US": v });

async function slugExists(slug) {
  const d = await fetch(
    `${BASE}/entries?content_type=quiz&fields.slug=${slug}&include=0`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  ).then((r) => r.json());
  return d.items.some((e) => e.fields.slug?.["en-US"] === slug);
}

async function createTyped(ct, fields) {
  const res = await fetch(`${BASE}/entries`, {
    method: "POST",
    headers: { ...H, "X-Contentful-Content-Type": ct },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`create ${ct}: ${res.status} ${await res.text()}`);
  const entry = await res.json();
  await fetch(`${BASE}/entries/${entry.sys.id}/published`, {
    method: "PUT",
    headers: { ...H, "X-Contentful-Version": String(entry.sys.version) },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`publish: ${r.status} ${await r.text()}`);
  });
  return entry;
}

const quizzes = [
  {
    title: "Who's more Introverted?",
    slug: "more-introverted",
    description: "Head-to-head Unidata showdown. Vote; the leaderboard ranks everyone.",
    theme: "unidata",
    prompt: "Who's more introverted?",
  },
  {
    title: "Who's more Kanal?",
    slug: "more-kanal",
    description: "Head-to-head Unidata showdown. Vote; the leaderboard ranks everyone.",
    theme: "unidata",
    prompt: "Who's more kanal?",
  },
];

for (const q of quizzes) {
  if (await slugExists(q.slug)) {
    console.log(`quiz '${q.slug}' exists, skipping`);
    continue;
  }
  const question = await createTyped("question", {
    type: L("pairwise"),
    prompt: L(q.prompt),
    options: L(names),
  });
  const link = { sys: { type: "Link", linkType: "Entry", id: question.sys.id } };
  await createTyped("quiz", {
    title: L(q.title),
    slug: L(q.slug),
    description: L(q.description),
    theme: L(q.theme),
    questions: { "en-US": [link] },
  });
  console.log(`live at /q/${q.slug}`);
}
void CDA;
