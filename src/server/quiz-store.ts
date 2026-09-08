import { eq } from "drizzle-orm";

import type { Matchup, Quiz } from "~/lib/quiz";
import { START_ELO } from "~/lib/quiz";
import { getQuizWithFallback } from "~/lib/quiz-fallback";
import { db } from "~/server/db";
import { candidateRatings } from "~/server/db/schema";

/** Quiz loading: Contentful first, sample fixture on any failure. */
export const loadQuizBySlug = getQuizWithFallback;

/** Distinct pairwise candidate names for a quiz (seed source). */
export function pairwiseCandidates(quiz: Quiz): string[] {
  const qs = quiz.questions.filter((q) => q.type === "pairwise");
  // Versus = one pairwise question holding the whole pool. Multi-question
  // quizzes fall back to pooling their 2-option duels (runner votes).
  const pool =
    qs.length === 1
      ? (qs[0]?.options ?? [])
      : qs.filter((q) => q.options.length === 2).flatMap((q) => q.options);
  return [...new Set(pool.map((n) => n.trim()).filter(Boolean))];
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

export interface Rating {
  name: string;
  elo: number;
  votes: number;
}

/**
 * Least-votes bias (ported from vert-measure): first pick from the
 * votes<=min+1 pool so everyone surfaces regularly, second from the rest.
 * Shared by matchup GET and vote POST (which piggybacks the next pair to
 * save the client a round trip).
 */
export function pickMatchup(ratings: Rating[]): Matchup | null {
  if (ratings.length < 2) return null;
  const minVotes = Math.min(...ratings.map((r) => r.votes));
  const pool = ratings.filter((r) => r.votes <= minVotes + 1);
  const first = pool[Math.floor(Math.random() * pool.length)]!;
  const rest = ratings.filter((r) => r.name !== first.name);
  const second = rest[Math.floor(Math.random() * rest.length)]!;
  return { a: first.name, b: second.name };
}
