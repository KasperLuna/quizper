"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MemberScore } from "~/lib/quiz";
import { Card } from "~/components/ui";

function Histogram({
  buckets,
  entries,
}: {
  buckets: { label: string; count: number }[];
  entries: MemberScore[];
}) {
  const bars =
    buckets.length > 0
      ? buckets.map((b) => ({ key: b.label, title: `${b.label}: ${b.count}`, value: b.count }))
      : entries.map((e) => ({
          key: e.name,
          title: `${e.name}: ${e.votes} votes, Elo ${e.elo}`,
          value: e.votes,
        }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div
      role="img"
      aria-label={`Elo distribution across ${bars.length} buckets`}
      className="flex h-24 items-end gap-1.5"
    >
      {bars.map((b) => (
        <div
          key={b.key}
          title={b.title}
          className="flex-1 rounded-sm bg-neutral-400 dark:bg-neutral-500"
          style={{ height: `${Math.max(4, (b.value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

interface ScoreEntry {
  name: string;
  score: number;
}

interface LeaderboardPayload {
  ratings?: MemberScore[];
  buckets?: { label: string; count: number }[];
  entries?: MemberScore[];
  attempts?: { displayName: string | null; score: number }[];
}

/**
 * Live leaderboard: Elo rankings when ratings exist, best-scores fallback
 * otherwise. Shared by the leaderboard page and the results page.
 */
export default function Leaderboard({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<MemberScore[] | null>(null);
  const [buckets, setBuckets] = useState<{ label: string; count: number }[]>([]);
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/leaderboard?quiz=${slug}&mode=elo`);
        if (!res.ok) throw new Error("no api");
        const data = (await res.json()) as LeaderboardPayload;
        const list = Array.isArray(data)
          ? (data as unknown as MemberScore[])
          : (data.ratings ?? data.entries ?? []);
        if (alive) {
          setEntries(list);
          setBuckets(data.buckets ?? []);
          if (list.length === 0) {
            const sres = await fetch(`/api/leaderboard?quiz=${slug}&mode=score`);
            if (sres.ok) {
              const sdata = (await sres.json()) as LeaderboardPayload;
              setScores(
                (sdata.attempts ?? []).map((a) => ({
                  name: a.displayName ?? "Anonymous",
                  score: a.score,
                })),
              );
            } else if (alive) {
              setScores([]);
            }
          } else if (alive) {
            setScores(null);
          }
        }
      } catch {
        if (alive) setEntries([]);
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [slug]);

  const sorted = useMemo(
    () => [...(entries ?? [])].sort((a, b) => b.elo - a.elo || b.votes - a.votes),
    [entries],
  );

  if (entries === null) {
    return (
      <p className="text-[17px] text-neutral-500 dark:text-neutral-400">Loading…</p>
    );
  }

  if (sorted.length === 0 && (scores === null || scores.length === 0)) {
    return (
      <Card className="flex flex-col gap-2 p-6">
        <p className="text-[20px] font-semibold">No votes yet</p>
        <p className="text-[17px] text-neutral-500 dark:text-neutral-400">
          Be the first to answer this quiz.
        </p>
        <Link
          href={`/q/${slug}`}
          className="pt-1 text-[17px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Take the quiz
        </Link>
      </Card>
    );
  }

  if (sorted.length > 0) {
    return (
      <>
        <Card className="p-5">
          <Histogram buckets={buckets} entries={sorted} />
        </Card>
        <ol className="flex flex-col gap-2" aria-label="Rankings">
          {sorted.map((e, i) => (
            <li key={e.name}>
              <Card className="flex items-center gap-3 px-5 py-3.5">
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-[15px] font-semibold text-neutral-500 tabular-nums dark:text-neutral-400"
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[17px] font-medium">{e.name}</span>
                <span className="text-[13px] text-neutral-500 tabular-nums dark:text-neutral-400">
                  {e.votes} {e.votes === 1 ? "vote" : "votes"} · Elo {e.elo}
                </span>
              </Card>
            </li>
          ))}
        </ol>
      </>
    );
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Best scores">
      {(scores ?? []).map((e, i) => (
        <li key={`${e.name}-${i}`}>
          <Card className="flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden="true"
              className="w-6 shrink-0 text-[15px] font-semibold text-neutral-500 tabular-nums dark:text-neutral-400"
            >
              {i + 1}
            </span>
            <span className="flex-1 text-[17px] font-medium">{e.name}</span>
            <span className="text-[13px] text-neutral-500 tabular-nums dark:text-neutral-400">
              {e.score}%
            </span>
          </Card>
        </li>
      ))}
    </ol>
  );
}
