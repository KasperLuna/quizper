"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answer, Quiz } from "~/lib/quiz";
import { encodeShare } from "~/lib/share";
import { AnswerRow, ProgressBar } from "~/components/ui";
import { TestHeader } from "~/components/brand-header";

const LETTERS = ["A", "B", "C", "D"];

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [focus, setFocus] = useState(0);
  const [name, setName] = useState("");
  const [finishing, setFinishing] = useState(false);
  // Tracks the question answered most recently: auto-advance fires only for
  // it, so Back/Skip navigation onto an answered question doesn't bounce.
  const justAnswered = useRef<string | null>(null);

  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const done = answers.length;
  const currentChoice = answers.find((a) => a.questionId === question?.id);

  const choose = useCallback(
    (choice: number) => {
      if (!question) return;
      justAnswered.current = question.id;
      setAnswers((prev) => {
        const next = prev.filter((a) => a.questionId !== question.id);
        next.push({ questionId: question.id, choice });
        return next;
      });
      // honey: fire-and-forget; vote loss on offline/flake acceptable v1, Elo converges.
      // Only 2-option duels record Elo; N-way picks are share-payload only.
      if (
        question.type === "pairwise" &&
        question.options.length === 2 &&
        choice < 2
      ) {
        const winner = question.options[choice];
        const loser = question.options[choice === 0 ? 1 : 0];
        void fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizSlug: quiz.slug, winner, loser }),
        }).catch(() => undefined);
      }
    },
    [question, quiz.slug],
  );

  // Advance shortly after answering so the checkmark-reveal reads.
  // Only for the just-answered question: revisiting an answered one via
  // Back/Skip must not bounce forward again.
  useEffect(() => {
    if (!currentChoice || !question) return;
    if (justAnswered.current !== question.id) return;
    justAnswered.current = null;
    if (index >= total - 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(
      () => {
        setIndex((i) => Math.min(i + 1, total - 1));
        setFocus(0);
      },
      reduce ? 0 : 180,
    );
    return () => window.clearTimeout(t);
  }, [currentChoice, index, total, question]);

  // Keyboard: 1-4 / A-D answer, arrows move focus, Enter confirms.
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      // Never hijack keystrokes typed into form fields (e.g. the name input).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const n = question.options.length;
      if (e.key >= "1" && e.key <= String(Math.min(n, 9))) {
        choose(Number(e.key) - 1);
        return;
      }
      const upper = e.key.toUpperCase();
      const li = LETTERS.indexOf(upper);
      if (li >= 0 && li < n) {
        choose(li);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocus((f) => (f + 1) % n);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setFocus((f) => (f - 1 + n) % n);
      } else if (e.key === "Enter") {
        choose(focus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, choose, focus]);

  useEffect(() => setFocus(0), [index]);

  const finish = useCallback(async () => {
    setFinishing(true);
    const ordered = quiz.questions.flatMap((q) => {      const a = answers.find((x) => x.questionId === q.id);
      return a ? [a] : [];
    });
    const scorable = quiz.questions.filter(
      (q) => q.correctIndex !== undefined,
    );
    const correct = scorable.filter((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      return a !== undefined && a.choice === q.correctIndex;
    }).length;
    let score =
      scorable.length > 0
        ? Math.round((correct / scorable.length) * 100)
        : 0;
    // Server is source of truth for recorded score; share URL carries it.
    const displayName = name.trim();
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizSlug: quiz.slug,
          answers: ordered,
          ...(displayName ? { displayName } : {}),
        }),
      });
      if (res.ok) score = ((await res.json()) as { score: number }).score;
    } catch {
      // offline: fall back to client-computed score, unrecorded
    } finally {
      setFinishing(false);
    }
    router.push(`/q/${quiz.slug}/results?s=${encodeShare({ answers: ordered, score })}`);
  }, [answers, name, quiz, router]);

  const announcement = useMemo(() => {
    if (!question) return "";
    return `Question ${index + 1} of ${total}: ${question.prompt}`;
  }, [index, total, question]);

  if (!question) return null;
  const isDuel = question.type === "pairwise" && question.options.length === 2;

  return (
    <div className="flex min-h-dvh flex-col">
      <ProgressBar value={done / total} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 pt-6 pb-28">
        <TestHeader />
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Question {index + 1} of {total}
        </p>
        <h1 className="text-[20px] leading-snug font-semibold text-balance">
          {question.prompt}
        </h1>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        {isDuel ? (
          <div
            role="group"
            aria-label="Pick one"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {question.options.slice(0, 2).map((opt, i) => {
              const selected = currentChoice?.choice === i;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => choose(i)}
                  aria-pressed={selected}
                  className={`flex min-h-[120px] items-center justify-center rounded-2xl border p-6 text-center text-[17px] font-medium transition-transform duration-150 ease-out motion-reduce:transition-none ${
                    selected
                      ? "border-accent bg-accent/[0.08] dark:bg-accent/20"
                      : "border-black/10 bg-white dark:border-white/15 dark:bg-card-dark"
                  } active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div role="group" aria-label="Answer options" className="flex flex-col gap-3">
            {question.options.map((opt, i) => (
              <AnswerRow
                key={`${question.id}-${i}`}
                index={i}
                label={opt}
                hint={i < 4 ? `${i + 1} / ${LETTERS[i]}` : `${i + 1}`}
                selected={currentChoice?.choice === i}
                focused={focus === i && currentChoice?.choice !== i}
                onSelect={() => choose(i)}
              />
            ))}
          </div>
        )}

        {index === total - 1 ? (
          <label className="flex flex-col gap-1.5 pt-2">
            <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Your name (optional — shown on the leaderboard)
            </span>
            <input
              type="text"
              value={name}
              maxLength={64}
              autoComplete="nickname"
              placeholder="e.g. Ada"
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-2xl border border-black/10 bg-white px-5 text-[17px] outline-none placeholder:text-neutral-400 focus:border-accent dark:border-white/15 dark:bg-card-dark dark:placeholder:text-neutral-500"
            />
          </label>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}            className="rounded-full px-4 py-2 text-[17px] text-neutral-500 disabled:opacity-40 dark:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
              className="rounded-full px-4 py-2 text-[17px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Skip
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={answers.length === 0 || finishing}
              className="rounded-full bg-accent px-6 py-2.5 text-[17px] font-semibold text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {finishing ? "Saving…" : "See results"}
            </button>
          )}
        </div>
      </main>

      {index === total - 1 && answers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-white/90 backdrop-blur dark:border-white/15 dark:bg-black/80">
          <div className="mx-auto w-full max-w-xl px-5 py-3">
            <button
              type="button"
              onClick={finish}
              disabled={finishing}
              className="w-full rounded-2xl bg-accent py-3.5 text-[17px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {finishing
                ? "Saving…"
                : `See results (${answers.length}/${total} answered)`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
