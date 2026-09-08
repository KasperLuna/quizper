import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { env } from "~/env";

/**
 * On-demand ISR invalidation for Contentful publishes.
 * Contentful webhook (Entry publish/unpublish, quiz+question) POSTs here
 * with `x-revalidate-secret`; we revalidate `/` and the affected quiz page.
 * Time-based `revalidate = 3600` on the pages remains as backstop.
 */
function authorized(request: Request): boolean {
  if (!env.REVALIDATE_SECRET) return false;
  const header = request.headers.get("x-revalidate-secret");
  const query = new URL(request.url).searchParams.get("secret");
  return header === env.REVALIDATE_SECRET || query === env.REVALIDATE_SECRET;
}

function slugFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  // Manual call: { slug: "..." }
  if (typeof b.slug === "string" && b.slug.length > 0) return b.slug;
  // Contentful webhook entry payload: fields.slug.{locale}
  const fields = b.fields;
  if (fields && typeof fields === "object") {
    const slugField = (fields as Record<string, unknown>).slug;
    if (typeof slugField === "string") return slugField;
    if (slugField && typeof slugField === "object") {
      const first = Object.values(slugField as Record<string, unknown>)[0];
      if (typeof first === "string" && first.length > 0) return first;
    }
    // A question changed: we don't know its quizzes — revalidate index only.
  }
  return undefined;
}

async function invalidate(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const slug =
    new URL(request.url).searchParams.get("slug") ?? slugFromBody(body);
  revalidatePath("/");
  if (slug) revalidatePath(`/q/${slug}`);
  return NextResponse.json({ revalidated: true, slug: slug ?? null });
}

export async function POST(request: Request) {
  return invalidate(request);
}

// Manual curl: GET /api/revalidate?secret=...&slug=...
export async function GET(request: Request) {
  return invalidate(request);
}
