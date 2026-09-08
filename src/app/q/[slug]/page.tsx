import { notFound } from "next/navigation";
import type { Quiz } from "~/lib/quiz";
import QuizRunner from "~/components/quiz-runner";
import VersusRunner from "~/components/versus-runner";
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
  // Versus is a quiz type: exactly one pairwise question holding the whole
  // candidate pool. Everything else is the one-pass quiz runner.
  const versus =
    quiz.questions.length === 1 && quiz.questions[0]?.type === "pairwise"
      ? quiz.questions[0]
      : undefined;
  if (versus) {
    return <VersusRunner slug={quiz.slug} title={quiz.title} prompt={versus.prompt} />;
  }
  return <QuizRunner quiz={quiz} />;
}
