import { NextResponse } from "next/server";

import { pickMatchup, seedRatingsIfEmpty } from "~/server/quiz-store";

export async function GET(request: Request) {
  const quizSlug = new URL(request.url).searchParams.get("quiz");
  if (!quizSlug) {
    return NextResponse.json({ error: "missing ?quiz=slug" }, { status: 400 });
  }

  const ratings = await seedRatingsIfEmpty(quizSlug);
  if (ratings === null) {
    return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
  }
  const matchup = pickMatchup(ratings);
  if (!matchup) {
    return NextResponse.json(
      { error: "need at least 2 candidates" },
      { status: 500 },
    );
  }
  return NextResponse.json(matchup);
}
