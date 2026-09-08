import { getQuizBySlug } from "./contentful";
import type { Quiz } from "./quiz";
import sample from "../../fixtures/quiz.sample.json";

/**
 * Dev-convenience fallback: serve the local fixture when Contentful is
 * unreachable or unconfigured. UI routes (Track C) call getQuizWithFallback();
 * production with working creds never touches the fixture.
 */

const fallbackQuiz = sample as unknown as Quiz;

/** Fixture quiz, only when the slug matches. Otherwise null. */
export function getFallbackQuiz(slug: string): Quiz | null {
  return slug === fallbackQuiz.slug ? fallbackQuiz : null;
}

/** Contentful first, fixture on any failure. Never throws for missing creds. */
export async function getQuizWithFallback(slug: string): Promise<Quiz | null> {
  try {
    const quiz = await getQuizBySlug(slug);
    if (quiz) return quiz;
  } catch {
    // Contentful unreachable or unconfigured — fall through to fixture.
  }
  return getFallbackQuiz(slug);
}
