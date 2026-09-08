"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Leaderboard from "~/components/leaderboard";

export default function LeaderboardPage() {
  const params = useParams<{ slug: string }>();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">
        Leaderboard
      </h1>

      <Leaderboard slug={params.slug} />

      <div className="flex gap-6 pb-8 text-[17px]">
        <Link
          href={`/q/${params.slug}`}
          className="font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to quiz
        </Link>
      </div>
    </main>
  );
}
