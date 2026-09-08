"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Matchup } from "~/lib/quiz";

interface VoteResponse {
  next: Matchup | null;
}

/**
 * Versus quiz runner: endless pairwise matchups. Each vote POST returns the
 * next pair, so voting costs one round trip instead of two.
 */
export default function VersusRunner({
  slug,
  title,
  prompt,
}: {
  slug: string;
  title: string;
  prompt: string;
}) {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/matchup?quiz=${slug}`);
      if (!res.ok) throw new Error(await res.text());
      setMatchup((await res.json()) as Matchup);
    } catch {
      setError("Could not load matchup. Retry?");
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const vote = useCallback(
    async (winner: string, loser: string) => {
      if (voting) return;
      setVoting(true);
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizSlug: slug, winner, loser }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as VoteResponse;
        if (data.next) setMatchup(data.next);
        else await load();
      } catch {
        setError("Vote failed. Retry?");
      } finally {
        setVoting(false);
      }
    },
    [load, slug, voting],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-5 py-10">
        <div className="text-center">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">
            {prompt}
          </h1>
          <p className="mt-1 text-[17px] text-neutral-500 dark:text-neutral-400">
            {title} · ratings update live
          </p>
        </div>

        {error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-[17px] dark:border-white/15 dark:bg-card-dark"
          >
            {error}
          </button>
        ) : matchup ? (
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {[matchup.a, matchup.b].map((candidate, i) => {
              const other = i === 0 ? matchup.b : matchup.a;
              return (
                <button
                  key={candidate}
                  type="button"
                  disabled={voting}
                  onClick={() => void vote(candidate, other)}
                  className="flex min-h-[160px] items-center justify-center rounded-2xl border border-black/10 bg-white p-6 text-center text-[20px] font-semibold transition-transform duration-150 ease-out motion-reduce:transition-none active:scale-[0.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-white/15 dark:bg-card-dark"
                >
                  {candidate}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[17px] text-neutral-500 dark:text-neutral-400">
            Loading…
          </p>
        )}

        <Link
          href={`/q/${slug}/leaderboard`}
          className="text-[17px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Leaderboard →
        </Link>
      </main>
    </div>
  );
}
