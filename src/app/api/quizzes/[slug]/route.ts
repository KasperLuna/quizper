import { NextResponse } from "next/server";
import type { Quiz } from "~/lib/quiz";
import sample from "~/../fixtures/quiz.sample.json";

/** Single quiz JSON for client components (results page). CMS first, fixture fallback. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const { getQuizBySlug } = await import("~/lib/contentful");
    const quiz = await getQuizBySlug(slug);
    if (quiz) return NextResponse.json(quiz);
  } catch {
    // fall through to fixture
  }
  if (slug === (sample as Quiz).slug) return NextResponse.json(sample);
  return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
}
