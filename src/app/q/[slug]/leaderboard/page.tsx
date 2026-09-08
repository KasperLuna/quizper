"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

interface LeaderboardPayload {
  ratings?: MemberScore[];
  buckets?: { label: string; count: number }[];
  entries?: MemberScore[];
}

export default function LeaderboardPage() {
  const params = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<MemberScore[] | null>(null);
  const [buckets, setBuckets] = useState<{ label: string; count: number }[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/leaderboard?quiz=${params.slug}&mode=elo`,
        );
        if (!res.ok) throw new Error("no api");
        const data = (await res.json()) as LeaderboardPayload;
        const list = Array.isArray(data)
          ? (data as unknown as MemberScore[])
          : (data.ratings ?? data.entries ?? []);
        if (alive) {
          setEntries(list);
          setBuckets(data.buckets ?? []);
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
  }, [params.slug]);

  const sorted = useMemo(
    () => [...(entries ?? [])].sort((a, b) => b.elo - a.elo || b.votes - a.votes),
    [entries],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">
        Leaderboard
      </h1>

      {entries === null ? (
        <p className="text-[17px] text-neutral-500 dark:text-neutral-400">
          Loading…
        </p>
      ) : sorted.length === 0 ? (
        <Card className="flex flex-col gap-2 p-6">
          <p className="text-[20px] font-semibold">No votes yet</p>
          <p className="text-[17px] text-neutral-500 dark:text-neutral-400">
            Be the first to answer this quiz.
          </p>
          <Link
            href={`/q/${params.slug}`}
            className="text-accent pt-1 text-[17px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Take the quiz
          </Link>
        </Card>
      ) : (
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
      )}

      <Link
        href={`/q/${params.slug}`}
        className="text-accent pb-8 text-[17px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to quiz
      </Link>
    </main>
  );
}
