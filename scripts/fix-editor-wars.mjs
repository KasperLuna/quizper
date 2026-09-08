/**
 * Restructures editor-wars into a single pairwise question holding the whole
 * candidate pool (versus = one question, N options). Old duel questions are
 * unpublished. Existing Elo ratings carry over (keyed by candidate name).
 * Usage: node scripts/fix-editor-wars.mjs
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

const L = (v) => ({ "en-US": v });

// Current quiz entry (for version + old links).
const found = await fetch(
  `${BASE}/entries?content_type=quiz&fields.slug=editor-wars&include=0`,
  { headers: { Authorization: `Bearer ${TOKEN}` } },
).then((r) => r.json());
const quiz = found.items.find(
  (e) => e.fields.slug?.["en-US"] === "editor-wars",
);
if (!quiz) throw new Error("editor-wars quiz not found");
const oldIds = (quiz.fields.questions?.["en-US"] ?? []).map((l) => l.sys.id);
console.log("old question links:", oldIds.length);

const created = await fetch(`${BASE}/entries`, {
  method: "POST",
  headers: { ...H, "X-Contentful-Content-Type": "question" },
  body: JSON.stringify({
    fields: {
      type: L("pairwise"),
      prompt: L("Which one rules them all?"),
      options: L(["Tabs", "Spaces", "Light mode", "Dark mode", "Vim", "Emacs"]),
    },
  }),
}).then(async (r) => {
  if (!r.ok) throw new Error(`create: ${r.status} ${await r.text()}`);
  return r.json();
});
await cm("PUT", `/entries/${created.sys.id}/published`, null, created.sys.version);
console.log("pool question published");

const link = (id) => ({ sys: { type: "Link", linkType: "Entry", id } });
const updated = {
  ...quiz.fields,
  questions: { "en-US": [link(created.sys.id)] },
};
const put = await cm("PUT", `/entries/${quiz.sys.id}`, { fields: updated }, quiz.sys.version);
await cm("PUT", `/entries/${quiz.sys.id}/published`, null, put.sys.version);
console.log("quiz relinked + published");

for (const id of oldIds) {
  const e = await cm("GET", `/entries/${id}`);
  await cm("DELETE", `/entries/${id}/published`, null, e.sys.version);
  console.log("unpublished", id);
}
void CDA;
console.log("Done. /q/editor-wars is now single-pool versus.");
