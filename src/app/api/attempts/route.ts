import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";
import { quizAttempts } from "~/server/db/schema";
import { loadQuizBySlug } from "~/server/quiz-store";

const attemptSchema = z.object({
  quizSlug: z.string().min(1).max(128),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      choice: z.number().int().min(0),
    }),
  ),
  displayName: z.string().trim().min(1).max(64).optional(),
});

export async function POST(request: Request) {
  const parsed = attemptSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid attempt" }, { status: 400 });
  }
  const { quizSlug, answers, displayName } = parsed.data;

  const quiz = await loadQuizBySlug(quizSlug);
  if (!quiz) {
    return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
  }

  // Score recomputed server-side against quiz content; pairwise answers are
  // votes, not scored — excluded here. Unknown questionIds are ignored.
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));
  let correct = 0;
  let total = 0;
  for (const q of quiz.questions) {
    if (q.type === "pairwise" || q.correctIndex === undefined) continue;
    total += 1;
    if (byId.get(q.id) && answers.find((a) => a.questionId === q.id)?.choice === q.correctIndex) {
      correct += 1;
    }
  }
  const score = total === 0 ? 0 : Math.round((100 * correct) / total);

  const [row] = await db
    .insert(quizAttempts)
    .values({ quizSlug, answers, score, displayName: displayName ?? null })
    .returning({ id: quizAttempts.id });
  if (!row) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
  return NextResponse.json({ id: row.id, score });
}
