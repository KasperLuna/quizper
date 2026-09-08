# Decisions

## Track B — quiz engine (2026-09-08)

- **No `db.transaction` on Neon HTTP**: the neon-http driver throws
  ("No transactions support in neon-http driver"). Vote writes (2 rating
  updates + 1 vote row) go out as one `db.batch()` — a single HTTP round
  trip, applied together. Read-modify-write races across serverless
  instances remain possible; accepted at v1 scale. Revisit with
  `@neondatabase/serverless` websocket driver or `sql.transaction()` if
  vote contention becomes real.
- **Quiz loading without Track A**: `src/lib/contentful.ts` doesn't exist
  yet, so `loadQuizBySlug` (in `src/app/api/matchup/route.ts`, imported by
  attempts) reads `fixtures/quiz.<slug>.json` → `fixtures/quiz.sample.json`
  (slug must match), then dynamic-imports `~/lib/contentful` via a
  non-literal specifier (no static dep, tsc-safe) expecting `getQuiz(slug)`.
  Track A: replace with a static import once the content loader lands.
- **Seeding**: ratings seeded from distinct pairwise `options` across all
  pairwise questions at `START_ELO`/0 votes on first matchup hit.
- **Scoring**: server-side only; pairwise excluded, unknown questionIds
  ignored, no scorable questions → score 0. Client score in share URLs is
  never trusted (see `src/lib/share.ts`).
- **Share codec**: base64url(JSON) `{answers, score}`, zod-validated on
  decode, null on any malformed input, 8KB cap. Edge-safe (no Buffer).
- **Leaderboard**: `?mode=elo` → ratings desc; `?mode=score` → top 50
  attempts desc. `buildBuckets` ported verbatim from vert-measure
  (8 buckets, size rounded to 50); Track C owns monochrome styling.

## Track C (UI) — 2026-09-08

- Standalone-first, CMS-second: server pages call Track A
  (`fetchQuizzes`/`getQuizBySlug`, dynamic import so no static dep) with
  fixture fallback, so routes render with zero backend. `revalidate = 3600`
  per Track A note.
- Single share codec: `src/lib/share.ts` (Track B `{answers, score}`,
  zod-validated, null on malformed). Runner encodes it; results decodes it
  client-side in `Suspense` and recomputes the score from quiz content.
- Keyboard: `1-4`/`A-D` answer, arrows move focus, `Enter` confirms.
  Auto-advance 180ms (0 under reduced-motion); polite live region announces
  each question. Accent only on interactive + progress + numeral;
  leaderboard histogram renders Track B `buckets` as monochrome bars.
