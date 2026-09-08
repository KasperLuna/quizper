import { notFound } from "next/navigation";
import Link from "next/link";
import type { Quiz } from "~/lib/quiz";
import QuizRunner from "~/components/quiz-runner";
import sample from "~/../fixtures/quiz.sample.json";

export const revalidate = 3600;

async function getQuiz(slug: string): Promise<Quiz | null> {
  try {
    const { getQuizBySlug } = await import("~/lib/contentful");
    const quiz = await getQuizBySlug(slug);
    if (quiz) return quiz;
  } catch {
    // fall through to fixture
  }
  return slug === (sample as Quiz).slug ? (sample as Quiz) : null;
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = await getQuiz(slug);
  if (!quiz) notFound();
  const hasVersus = quiz.questions.some((q) => q.type === "pairwise");
  return (
    <>
      {hasVersus ? (
        <div className="mx-auto w-full max-w-xl px-5 pt-6">
          <Link
            href={`/q/${slug}/versus`}
            className="text-[15px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Prefer head-to-head? Vote pairwise instead →
          </Link>
        </div>
      ) : null}
      <QuizRunner quiz={quiz} />
    </>
  );
}
