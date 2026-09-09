"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { Answer, Quiz } from "~/lib/quiz";
import { decodeShare } from "~/lib/share";
import { Card, ScoreNumeral } from "~/components/ui";
import Leaderboard from "~/components/leaderboard";
import { TestHeader } from "~/components/brand-header";
import sample from "~/../fixtures/quiz.sample.json";

function ResultsBody() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(
    params.slug === (sample as Quiz).slug ? (sample as Quiz) : null,
  );

  const answers: Answer[] = useMemo(() => {
    const s = search.get("s");
    if (!s) return [];
    return decodeShare(s)?.answers ?? [];
  }, [search]);

  useEffect(() => {
    if (quiz || !params.slug) return;
    void fetch(`/api/quizzes/${params.slug}`)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((q: unknown) => {
        if (q) setQuiz(q as Quiz);
      })
      .catch(() => undefined);
  }, [quiz, params.slug]);

  const scorable = useMemo(
    () => (quiz?.questions ?? []).filter((q) => q.correctIndex !== undefined),
    [quiz],
  );
  const correct = useMemo(() => {
    if (!quiz) return 0;
    return scorable.filter((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      return a !== undefined && a.choice === q.correctIndex;
    }).length;
  }, [quiz, scorable, answers]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!quiz) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-5 py-16">
        <h1 className="text-[28px] font-bold tracking-tight">Quiz not found</h1>
        <Link href="/" className="text-accent text-[17px]">
          Back to quizzes
        </Link>
      </main>
    );
  }

  const pct =
    scorable.length > 0 ? `${Math.round((correct / scorable.length) * 100)}%` : "—";
  const picked = (qid: string) => answers.find((a) => a.questionId === qid);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10">
      <TestHeader />
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">
        {quiz.title} — results
      </h1>

      <Card className="p-6">
        <ScoreNumeral
          value={pct}
          label={
            scorable.length > 0
              ? `${correct} of ${scorable.length} correct`
              : "No scored questions"
          }
        />
        <button
          type="button"
          onClick={copyShare}
          className="mt-4 w-full rounded-2xl bg-accent py-3 text-[17px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? "Copied" : "Copy share link"}
        </button>
      </Card>

      <ol className="flex flex-col gap-3" aria-label="Per-question results">
        {quiz.questions.map((q) => {
          const a = picked(q.id);
          const isPairwise = q.type === "pairwise";
          const isCorrect =
            !isPairwise && a !== undefined && a.choice === q.correctIndex;
          return (
            <li key={q.id}>
              <Card className="flex flex-col gap-1.5 p-5">
                <p className="text-[17px] font-semibold">{q.prompt}</p>
                <p className="text-[15px] text-neutral-500 dark:text-neutral-400">
                  {a === undefined
                    ? "Not answered"
                    : isPairwise || q.correctIndex === undefined
                      ? `You picked ${q.options[a.choice] ?? "—"}`
                      : isCorrect
                        ? `Correct — ${q.options[a.choice] ?? ""}`
                        : `You answered ${q.options[a.choice] ?? "—"}; correct: ${q.options[q.correctIndex] ?? "—"}`}
                </p>
                {q.explanation ? (
                  <p className="text-[15px] text-neutral-600 dark:text-neutral-300">
                    {q.explanation}
                  </p>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 pt-2">
        <h2 className="text-[20px] font-bold tracking-tight">Leaderboard</h2>
        <Leaderboard slug={quiz.slug} />
      </div>

      <div className="flex gap-5 pb-8 text-[17px]">
        <Link
          href={`/q/${quiz.slug}`}
          className="text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Retake
        </Link>
        <Link
          href="/"
          className="text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          All quizzes
        </Link>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsBody />
    </Suspense>
  );
}
