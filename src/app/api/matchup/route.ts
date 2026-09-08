import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { z } from "zod";

import type { Matchup, Quiz } from "~/lib/quiz";
import { START_ELO } from "~/lib/quiz";
import { db } from "~/server/db";
import { candidateRatings } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Quiz loader (Track B local copy). Prefers a per-slug fallback fixture
 * (fixtures/quiz.<slug>.json, then fixtures/quiz.sample.json when the slug
 * matches), else defers to Track A's contentful lib once it lands.
 * Track A: replace the dynamic import below with a static getQuiz import.
 */
const quizSchema: z.ZodType<Quiz> = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  theme: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["pairwise", "mcq", "boolean"]),
      prompt: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int().optional(),
      explanation: z.string().optional(),
      mediaUrl: z.string().optional(),
    }),
  ),
});

export async function loadQuizBySlug(slug: string): Promise<Quiz | null> {
  for (const file of [`quiz.${slug}.json`, "quiz.sample.json"]) {
    try {
      const raw = await fs.readFile(
        path.join(process.cwd(), "fixtures", file),
        "utf-8",
      );
      const parsed = quizSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.slug === slug) return parsed.data;
    } catch {
      // missing/unparseable fixture — fall through
    }
  }
  try {
    // Non-literal specifier: no static dependency on Track A's file yet.
    const specifier = "~/lib/contentful";
    const mod = (await import(specifier)) as {
      getQuiz?: (slug: string) => Promise<unknown>;
    };
    if (typeof mod.getQuiz === "function") {
      const parsed = quizSchema.safeParse(await mod.getQuiz(slug));
      return parsed.success ? parsed.data : null;
    }
  } catch {
    // contentful lib not landed yet
  }
  return null;
}

/** Distinct pairwise candidate names for a quiz (seed source). */
export function pairwiseCandidates(quiz: Quiz): string[] {
  const names = quiz.questions
    .filter((q) => q.type === "pairwise")
    .flatMap((q) => q.options);
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
}

export async function seedRatingsIfEmpty(
  quizSlug: string,
): Promise<{ name: string; elo: number; votes: number }[] | null> {
  const existing = await db
    .select()
    .from(candidateRatings)
    .where(eq(candidateRatings.quizSlug, quizSlug));
  if (existing.length > 0) return existing;
  const quiz = await loadQuizBySlug(quizSlug);
  if (!quiz) return null;
  const names = pairwiseCandidates(quiz);
  if (names.length === 0) return [];
  await db.insert(candidateRatings).values(
    names.map((name) => ({ quizSlug, name, elo: START_ELO, votes: 0 })),
  );
  return names.map((name) => ({ name, elo: START_ELO, votes: 0 }));
}

export async function GET(request: Request) {
  const quizSlug = new URL(request.url).searchParams.get("quiz");
  if (!quizSlug) {
    return NextResponse.json({ error: "missing ?quiz=slug" }, { status: 400 });
  }

  const ratings = await seedRatingsIfEmpty(quizSlug);
  if (ratings === null) {
    return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
  }
  if (ratings.length < 2) {
    return NextResponse.json(
      { error: "need at least 2 candidates" },
      { status: 500 },
    );
  }

  // Least-votes bias (ported from vert-measure): first pick from the
  // votes<=min+1 pool so everyone surfaces regularly, second from the rest.
  const minVotes = Math.min(...ratings.map((r) => r.votes));
  const pool = ratings.filter((r) => r.votes <= minVotes + 1);
  const first = pool[Math.floor(Math.random() * pool.length)]!;
  const rest = ratings.filter((r) => r.name !== first.name);
  const second = rest[Math.floor(Math.random() * rest.length)]!;

  return NextResponse.json({ a: first.name, b: second.name } satisfies Matchup);
}
