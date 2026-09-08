import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { eloDelta } from "~/lib/quiz";
import { seedRatingsIfEmpty } from "~/server/quiz-store";
import { db } from "~/server/db";
import { candidateRatings, pairwiseVotes } from "~/server/db/schema";

const voteSchema = z.object({
  quizSlug: z.string().min(1).max(128),
  winner: z.string().min(1).max(256),
  loser: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.winner === parsed.data.loser) {
    return NextResponse.json({ error: "invalid vote" }, { status: 400 });
  }
  const { quizSlug, winner: winnerName, loser: loserName } = parsed.data;

  // The runner votes by name without ever hitting /api/matchup, so seed
  // here too — otherwise every first vote 404s on an empty ratings table.
  const seeded = await seedRatingsIfEmpty(quizSlug);
  if (seeded === null) {
    return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
  }

  const rows = seeded;
  const winner = rows.find((r) => r.name === winnerName);
  const loser = rows.find((r) => r.name === loserName);
  if (!winner || !loser) {
    return NextResponse.json({ error: "unknown candidate" }, { status: 404 });
  }

  const delta = eloDelta(winner.elo, loser.elo);
  const updatedWinner = { ...winner, elo: winner.elo + delta, votes: winner.votes + 1 };
  const updatedLoser = { ...loser, elo: loser.elo - delta, votes: loser.votes + 1 };

  // neon-http has no interactive transactions (db.transaction throws), so the
  // two rating updates + vote row go out as one db.batch: a single HTTP round
  // trip, applied together. Read-modify-write races across instances remain
  // possible — acceptable at v1 scale (see docs/decisions.md).
  const whereWinner = and(
    eq(candidateRatings.quizSlug, quizSlug),
    eq(candidateRatings.name, winnerName),
  );
  const whereLoser = and(
    eq(candidateRatings.quizSlug, quizSlug),
    eq(candidateRatings.name, loserName),
  );
  await db.batch([
    db
      .update(candidateRatings)
      .set({ elo: updatedWinner.elo, votes: updatedWinner.votes })
      .where(whereWinner),
    db
      .update(candidateRatings)
      .set({ elo: updatedLoser.elo, votes: updatedLoser.votes })
      .where(whereLoser),
    db.insert(pairwiseVotes).values({ quizSlug, winner: winnerName, loser: loserName, delta }),
  ]);

  return NextResponse.json({
    winner: { name: winnerName, elo: updatedWinner.elo, votes: updatedWinner.votes },
    loser: { name: loserName, elo: updatedLoser.elo, votes: updatedLoser.votes },
    delta,
  });
}
