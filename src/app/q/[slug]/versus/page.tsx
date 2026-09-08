import { redirect } from "next/navigation";

// Versus is a quiz type now, not a subpath: /q/[slug] renders the matchup
// UI directly for all-pairwise quizzes. Keep old links working.
export default async function VersusRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/q/${slug}`);
}
