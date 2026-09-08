import { eq } from "drizzle-orm";

import type { Quiz } from "~/lib/quiz";
import { START_ELO } from "~/lib/quiz";
import { getQuizWithFallback } from "~/lib/quiz-fallback";
import { db } from "~/server/db";
import { candidateRatings } from "~/server/db/schema";

/** Quiz loading: Contentful first, sample fixture on any failure. */
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
