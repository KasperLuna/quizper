import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { candidateRatings, quizAttempts } from "~/server/db/schema";
import { buildBuckets } from "~/lib/buckets";

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
