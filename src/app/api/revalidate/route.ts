import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { env } from "~/env";

/**
 * On-demand invalidation for Contentful publishes.
 * Contentful webhook (Entry publish/unpublish) POSTs here with
 * `x-revalidate-secret`. Data cache invalidation is tag-based:
 * quiz events bust `quiz` + `quiz-list`, anything else (e.g. question
 * edits, which don't map to parent quizzes) busts `contentful`.
 * Page shells are revalidated by path as well; per-page `revalidate = 3600`
 * remains as backstop.
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

function contentTypeFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const sys = (body as Record<string, unknown>).sys;
  if (!sys || typeof sys !== "object") return undefined;
  const ct = (sys as Record<string, unknown>).contentType;
  if (!ct || typeof ct !== "object") return undefined;
  const id = (ct as Record<string, unknown>).sys;
  if (!id || typeof id !== "object") return undefined;
  const linkId = (id as Record<string, unknown>).id;
  return typeof linkId === "string" ? linkId : undefined;
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
  const contentType = contentTypeFromBody(body);
  if (slug || contentType === "quiz") {
    revalidateTag("quiz");
    revalidateTag("quiz-list");
  } else {
    // Question edit (no parent-quiz mapping) or unknown payload: bust all.
    revalidateTag("contentful");
  }
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
