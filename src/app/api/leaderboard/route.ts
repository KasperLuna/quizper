import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { candidateRatings, quizAttempts } from "~/server/db/schema";

/**
 * Histogram buckets ported from unidata-vert-measure's leaderboard
 * buildBuckets: fixed-width buckets, size rounded up to the nearest 50 so
 * labels stay clean. Monochrome counts — styling is Track C's job.
 */
const TARGET_BUCKET_COUNT = 8;

export function buildBuckets(values: number[]): { label: string; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawSize = (max - min || 1) / TARGET_BUCKET_COUNT;
  const bucketSize = Math.max(50, Math.ceil(rawSize / 50) * 50);
  const start = Math.floor(min / bucketSize) * bucketSize;
  const end = Math.ceil(max / bucketSize) * bucketSize + bucketSize;
  const buckets: { label: string; count: number }[] = [];
  for (let b = start; b < end; b += bucketSize) {
    buckets.push({
      label: `${b}`,
      count: values.filter((v) => v >= b && v < b + bucketSize).length,
    });
  }
  return buckets;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const quizSlug = params.get("quiz");
  const mode = params.get("mode") ?? "elo";
  if (!quizSlug) {
    return NextResponse.json({ error: "missing ?quiz=slug" }, { status: 400 });
  }
  if (mode !== "elo" && mode !== "score") {
    return NextResponse.json(
      { error: "mode must be elo|score" },
      { status: 400 },
    );
  }

  if (mode === "elo") {
    const ratings = await db
      .select({
        name: candidateRatings.name,
        elo: candidateRatings.elo,
        votes: candidateRatings.votes,
      })
      .from(candidateRatings)
      .where(eq(candidateRatings.quizSlug, quizSlug))
      .orderBy(desc(candidateRatings.elo));
    return NextResponse.json({
      mode,
      ratings,
      buckets: buildBuckets(ratings.map((r) => r.elo)),
    });
  }

  const attempts = await db
    .select({
      id: quizAttempts.id,
      displayName: quizAttempts.displayName,
      score: quizAttempts.score,
      createdAt: quizAttempts.createdAt,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.quizSlug, quizSlug))
    .orderBy(desc(quizAttempts.score))
    .limit(50);
  return NextResponse.json({
    mode,
    attempts,
    buckets: buildBuckets(attempts.map((a) => a.score)),
  });
}
