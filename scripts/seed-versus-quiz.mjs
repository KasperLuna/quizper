/**
 * Seeds an all-pairwise versus quiz (renders endless head-to-head voting).
 * Skips creation if the slug already exists.
 * Usage: node scripts/seed-versus-quiz.mjs
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

async function cm(method, path, body, version) {
  const headers = { ...H };
  if (version !== undefined) headers["X-Contentful-Version"] = String(version);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createTyped(ct, fields) {
  const res = await fetch(`${BASE}/entries`, {
    method: "POST",
    headers: { ...H, "X-Contentful-Content-Type": ct },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`POST entries: ${res.status} ${await res.text()}`);
  const entry = await res.json();
  await cm("PUT", `/entries/${entry.sys.id}/published`, null, entry.sys.version);
  return entry;
}

const L = (v) => ({ "en-US": v });

const slug = "editor-wars";
const check = await fetch(
  `https://cdn.contentful.com/spaces/${SPACE}/environments/master/entries?content_type=quiz&fields.slug=${slug}&access_token=${CDA}`,
).then((r) => r.json());
if (check.total > 0) {
  console.log(`quiz '${slug}' exists, skipping`);
  process.exit(0);
}

const pairs = [
  ["Tabs or spaces?", "Tabs", "Spaces"],
  ["Light mode or dark mode?", "Light mode", "Dark mode"],
  ["One true editor?", "Vim", "Emacs"],
];
const questions = [];
for (const [prompt, a, b] of pairs) {
  questions.push(
    await createTyped("question", {
      type: L("pairwise"),
      prompt: L(prompt),
      options: L([a, b]),
    }),
  );
}
const link = (e) => ({ sys: { type: "Link", linkType: "Entry", id: e.sys.id } });
await createTyped("quiz", {
  title: L("Editor Wars"),
  slug: L(slug),
  description: L("Endless head-to-head duels. Vote; the leaderboard ranks every answer."),
  theme: L("versus"),
  questions: { "en-US": questions.map(link) },
});
console.log(`Done. Versus quiz live at /q/${slug}`);
