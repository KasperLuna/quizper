/**
 * Seeds the demo quiz into the shared portfolio Contentful space.
 * Reads SPACE_ID + MANAGEMENT_TOKEN from .env (never commits it).
 * Usage: node scripts/seed-demo-quiz.mjs
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
const ENV_ID = "master";
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV_ID}`;

if (!SPACE || !TOKEN) {
  console.error("Missing CONTENTFUL_SPACE_ID or CONTENTFUL_MANAGEMENT_TOKEN in .env");
  process.exit(1);
}

const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/vnd.contentful.management.v1+json",
};

async function req(method, path, body, version) {
  const headers = { ...H };
  if (version !== undefined) headers["X-Contentful-Version"] = String(version);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const QUIZ_TYPE = {
  name: "Quiz",
  fields: [
    { id: "title", name: "Title", type: "Symbol", required: true },
    { id: "slug", name: "Slug", type: "Symbol", required: true, validations: [{ unique: true }] },
    { id: "description", name: "Description", type: "Text", required: true },
    { id: "theme", name: "Theme", type: "Symbol", required: false },
    {
      id: "questions", name: "Questions", type: "Array", required: false,
      items: { type: "Link", linkType: "Entry", validations: [{ linkContentType: ["question"] }] },
    },
  ],
};

const QUESTION_TYPE = {
  name: "Question",
  fields: [
    { id: "type", name: "Type", type: "Symbol", required: true },
    { id: "prompt", name: "Prompt", type: "Symbol", required: true },
    { id: "options", name: "Options", type: "Array", required: true, items: { type: "Symbol" } },
    { id: "correctIndex", name: "Correct index", type: "Integer", required: false },
    { id: "explanation", name: "Explanation", type: "Text", required: false },
    { id: "media", name: "Media", type: "Link", linkType: "Asset", required: false },
  ],
};

async function ensureType(id, def) {
  const existing = await req("GET", "/content_types?limit=100");
  if (existing.items.some((t) => t.sys.id === id)) {
    console.log(`content type '${id}' exists, skipping`);
    return;
  }
  const created = await req("PUT", `/content_types/${id}`, def);
  await req("PUT", `/content_types/${id}/published`, null, created.sys.version);
  console.log(`content type '${id}' created + published`);
}

const L = (v) => ({ "en-US": v });

async function createTypedEntry(ct, fields) {
  const headers = { ...H, "X-Contentful-Content-Type": ct };
  const res = await fetch(`${BASE}/entries`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`POST entries: ${res.status} ${await res.text()}`);
  const entry = await res.json();
  await req("PUT", `/entries/${entry.sys.id}/published`, null, entry.sys.version);
  return entry;
}

await ensureType("question", QUESTION_TYPE);
await ensureType("quiz", QUIZ_TYPE);

const q1 = await createTypedEntry("question", {
  type: L("pairwise"), prompt: L("Tabs or spaces?"), options: L(["Tabs", "Spaces"]),
});
const q2 = await createTypedEntry("question", {
  type: L("pairwise"), prompt: L("Light mode or dark mode?"), options: L(["Light mode", "Dark mode"]),
});
const q3 = await createTypedEntry("question", {
  type: L("mcq"),
  prompt: L("Which language runs in the browser?"),
  options: L(["Python", "TypeScript", "Rust", "Go"]),
  correctIndex: L(1),
  explanation: L("TypeScript compiles to JavaScript, the browser's native language."),
});
const q4 = await createTypedEntry("question", {
  type: L("boolean"),
  prompt: L("Contentful powers this quiz."),
  options: L(["True", "False"]),
  correctIndex: L(0),
  explanation: L("Authors edit quizzes in Contentful; the site renders them."),
});

const link = (e) => ({ sys: { type: "Link", linkType: "Entry", id: e.sys.id } });
await createTypedEntry("quiz", {
  title: L("Demo Showdown"),
  slug: L("demo-showdown"),
  description: L("Pairwise duels plus scored trivia. Try versus mode for endless voting."),
  theme: L("demo"),
  questions: { "en-US": [link(q1), link(q2), link(q3), link(q4)] },
});

console.log("Done. Quiz live at /q/demo-showdown and /q/demo-showdown/versus");
