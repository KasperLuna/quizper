import { notFound } from "next/navigation";
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
  return <QuizRunner quiz={quiz} />;
}
