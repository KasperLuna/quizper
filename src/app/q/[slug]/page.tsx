import { notFound } from "next/navigation";
import type { Quiz } from "~/lib/quiz";
import QuizRunner from "~/components/quiz-runner";
import sample from "~/../fixtures/quiz.sample.json";

async function getQuiz(slug: string): Promise<Quiz | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (base) {
      const res = await fetch(`${base}/api/quizzes/${slug}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) return (await res.json()) as Quiz;
    }
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
