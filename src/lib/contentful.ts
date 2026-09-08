import { createClient } from "contentful";
import type { Entry } from "contentful";
import type { Question, QuestionType, Quiz } from "./quiz";

/**
 * Contentful CDA singleton for the quizper `quiz` / `question` model.
 *
 * NOTE (server-component callers): add `export const revalidate = 3600;`
 * in each route that calls fetchQuizzes()/getQuizBySlug(). The export must
 * live on the page/route, not here.
 *
 * The client is created lazily and throws ONLY on actual fetch, so
 * `pnpm check` / `tsc --noEmit` pass without credentials configured.
 */

type CdaClient = ReturnType<typeof createClient>;

let _client: CdaClient | undefined;

function getClient(): CdaClient {
  const space = process.env.CONTENTFUL_SPACE_ID;
  const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;
  if (!space || !accessToken) {
    throw new Error(
      "Missing Contentful credentials: set CONTENTFUL_SPACE_ID and CONTENTFUL_ACCESS_TOKEN.",
    );
  }
  _client ??= createClient({ space, accessToken });
  return _client;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Extract an https URL from a linked image Asset (unresolved links -> undefined). */
function mediaUrl(v: unknown): string | undefined {
  if (typeof v !== "object" || v === null || !("fields" in v)) return undefined;
  const fields = (v as { fields?: unknown }).fields;
  if (typeof fields !== "object" || fields === null || !("file" in fields))
    return undefined;
  const url = (fields as { file?: { url?: unknown } }).file?.url;
  if (typeof url !== "string" || url.length === 0) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
}

const QUESTION_TYPES: readonly QuestionType[] = ["pairwise", "mcq", "boolean"];

function isQuestionType(v: unknown): v is QuestionType {
  return (
    typeof v === "string" &&
    (QUESTION_TYPES as readonly string[]).includes(v)
  );
}

type RawFields = Record<string, unknown>;

function entryFields(item: unknown): (RawFields & { __id: string }) | null {
  if (typeof item !== "object" || item === null || !("fields" in item))
    return null;
  const entry = item as Entry;
  if (entry.sys?.type !== "Entry") return null; // unresolved Link
  return { ...(entry.fields as RawFields), __id: entry.sys.id };
}

function parseQuestion(item: unknown): Question | null {
  const f = entryFields(item);
  if (!f || !isQuestionType(f.type)) return null;
  const type = f.type;
  const prompt = str(f.prompt);
  const options = Array.isArray(f.options)
    ? f.options.filter((o): o is string => typeof o === "string")
    : [];
  if (!prompt || options.length < 2) return null;
  // Versus quizzes hold the whole pool in one pairwise question (3+ options);
  // 2-option pairwise is a single duel for the runner.

  const q: Question = { id: f.__id, type, prompt, options };
  if (type !== "pairwise") {
    const ci = f.correctIndex;
    if (
      typeof ci !== "number" ||
      !Number.isInteger(ci) ||
      ci < 0 ||
      ci >= options.length
    )
      return null;
    q.correctIndex = ci;
  }
  const explanation = str(f.explanation);
  if (explanation) q.explanation = explanation;
  const media = mediaUrl(f.media);
  if (media) q.mediaUrl = media;
  return q;
}

function parseQuiz(item: unknown): Quiz | null {
  const f = entryFields(item);
  if (!f) return null;
  const title = str(f.title);
  const slug = str(f.slug);
  const description = str(f.description);
  if (!title || !slug || !description) return null;
  const questions = Array.isArray(f.questions)
    ? f.questions
        .map(parseQuestion)
        .filter((q): q is Question => q !== null)
    : [];
  const quiz: Quiz = { title, slug, description, questions };
  const theme = str(f.theme);
  if (theme) quiz.theme = theme;
  return quiz;
}

/** All published quizzes. Skips entries that fail validation. */
export async function fetchQuizzes(): Promise<Quiz[]> {
  const res = await getClient().getEntries({ content_type: "quiz", include: 2 });
  return res.items.map(parseQuiz).filter((q): q is Quiz => q !== null);
}

/** Single quiz by slug. Null when missing, slug-mismatched, or invalid. */
export async function getQuizBySlug(slug: string): Promise<Quiz | null> {
  const res = await getClient().getEntries({
    content_type: "quiz",
    "fields.slug": slug,
    limit: 1,
    include: 2,
  });
  const item = res.items[0];
  if (!item) return null;
  const quiz = parseQuiz(item);
  if (quiz?.slug !== slug) return null;
  return quiz;
}
