import { NextResponse } from "next/server";

import type { Matchup } from "~/lib/quiz";
import { seedRatingsIfEmpty } from "~/server/quiz-store";

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
