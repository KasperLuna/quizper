import Link from "next/link";
import type { Quiz } from "~/lib/quiz";
import { Card } from "~/components/ui";
import sample from "~/../fixtures/quiz.sample.json";

async function getQuizzes(): Promise<Quiz[]> {
  // Tracks A/B APIs may not exist yet — try, fall back to fixture standalone.
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (base) {
      const res = await fetch(`${base}/api/quizzes`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data: unknown = await res.json();
        if (Array.isArray(data) && data.length > 0) return data as Quiz[];
      }
    }
  } catch {
    // fall through to fixture
  }
  return [sample as Quiz];
}

export default async function HomePage() {
  const quizzes = await getQuizzes();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-16">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">
        Quizper
      </h1>
      <ul className="flex flex-col gap-3">
        {quizzes.map((quiz) => (
          <li key={quiz.slug}>
            <Link
              href={`/q/${quiz.slug}`}
              className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Card className="flex flex-col gap-1 p-5 transition-transform duration-150 ease-out motion-reduce:transition-none active:scale-[0.99]">
                <span className="text-[20px] font-semibold">{quiz.title}</span>
                <span className="text-[17px] text-neutral-500 dark:text-neutral-400">
                  {quiz.description}
                </span>
                <span className="pt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                  {quiz.questions.length}{" "}
                  {quiz.questions.length === 1 ? "question" : "questions"}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
