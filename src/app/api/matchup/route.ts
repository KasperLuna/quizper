import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import type { Matchup, Quiz } from "~/lib/quiz";
import { START_ELO } from "~/lib/quiz";
import { getQuizWithFallback } from "~/lib/quiz-fallback";
import { db } from "~/server/db";
import { candidateRatings } from "~/server/db/schema";

/**
 * Quiz loading: Contentful first, sample fixture on any failure
 * (Track A's getQuizWithFallback). Re-exported for the attempts route.
 */
export const loadQuizBySlug = getQuizWithFallback;

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
