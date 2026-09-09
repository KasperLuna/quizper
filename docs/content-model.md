# Content Model (shared portfolio space)

Reuse the personal-portfolio Contentful space — add `quiz` / `question`
content types alongside `portfolioProject`, `portfolioSkill`, `event`
(no ID clashes). Same `CONTENTFUL_SPACE_ID` + `CONTENTFUL_ACCESS_TOKEN`
as the portfolio; copy them from its `.env.local`. Fetch with `include: 2`
so linked questions resolve in one request. Server-component callers set
`export const revalidate = 3600;`.

## `quiz`

| Field         | Type            | Required | Notes                                    |
| ------------- | --------------- | -------- | ---------------------------------------- |
| `title`       | Short text      | yes      | Displayed as the page large-title.       |
| `slug`        | Short text      | yes      | Unique, URL-safe (`my-quiz`). Slug field |
|               |                 |          | type preferred; validated unique.        |
| `description` | Long text       | yes      | Index card subtitle + runner intro.      |
| `theme`       | Short text      | no       | Free tag (e.g. `general`).               |
| `questions`   | References, many| no       | Links to `question` entries. Empty = valid (renders title only). |

## `question`

| Field          | Type            | Required | Notes                                                        |
| -------------- | --------------- | -------- | ------------------------------------------------------------ |
| `type`         | Short text      | yes      | Exactly `pairwise`, `mcq`, or `boolean`. Validate via list.  |
| `prompt`       | Short text      | yes      | The question headline.                                       |
| `options`      | Short text, list| yes      | `mcq`: 2+ answers. `boolean`: `True`,`False`. `pairwise`: 2 = single duel (runner), 3+ = versus pool (see below). |
| `correctIndex` | Integer         | no       | Scored answer index. Omit = opinion gauge, shown unscored. |
| `explanation`  | Long text       | no       | Shown on results.                                            |
| `media`        | Media, one file | no       | Optional image. Asset URL used as `mediaUrl`.                |

Parser rules (`src/lib/contentful.ts`): entries missing required fields are
skipped, not fatal. `correctIndex`, when present but invalid, is ignored
(opinion gauge). `pairwise` needs 2+ options.
Unresolved links (no `include`) are skipped.

## Versus quizzes (Elo)

A versus quiz is **exactly one `pairwise` question holding the whole
candidate pool** (3+ options) — never several 2-option questions. The
question prompt becomes the heading ("Which one rules them all?"), every
pairing draws from the pool, and the leaderboard ranks all candidates
against each other. Multi-question quizzes with 2-option pairwise
questions stay runner duels (Elo recorded per duel); N-way pairwise in a
runner is share-payload only, no Elo.

## Authoring steps

1. In the portfolio space, create content types `quiz` and `question` with the fields above.
2. Add `question` entries first (prompt, type, options, correct answer).
3. Add a `quiz` entry; link its `questions` in display order.
4. Publish quiz + all linked questions (unpublished links resolve empty).
5. Verify: open `/q/<slug>` — with `revalidate = 3600` edits appear within the hour.

## Instant updates (webhook → cache tags)

Contentful loaders are cached (`unstable_cache`, 1h) under tags
`contentful` / `quiz-list` / `quiz`. The webhook busts tags, not pages:

1. `REVALIDATE_SECRET` is set in `.env` (local) and Vercel production env.
   Generate a fresh one with `openssl rand -hex 32` if needed.
2. Contentful dashboard → Settings → Webhooks → Add webhook:
   - URL: `https://quizper.kasperluna.com/api/revalidate`
   - Triggers: Entry → Publish + Unpublish (all content types)
   - Headers: `x-revalidate-secret: <REVALIDATE_SECRET>` (mark secret)
3. Quiz events bust `quiz` + `quiz-list`; question edits (no parent-quiz
   mapping) bust the broad `contentful` tag. Page shells (`/`, `/q/<slug>`)
   revalidate by path too; per-page `revalidate = 3600` is the backstop.
4. Test: publish any entry → site updates within seconds.
   Manual equivalent: `GET /api/revalidate?secret=...&slug=...`.

Live API data is cached separately: `GET /api/leaderboard` carries
`revalidate = 5` (~5s staleness); matchup/vote/attempts are
`force-dynamic` and never cache.
