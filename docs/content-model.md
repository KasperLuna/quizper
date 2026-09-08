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
| `options`      | Short text, list| yes      | `mcq`: 2+ answers. `boolean`: `True`,`False`. `pairwise`: exactly 2 candidate names. |
| `correctIndex` | Integer         | mcq/boolean only | Index into `options`. Omit for `pairwise`.          |
| `explanation`  | Long text       | no       | Shown on results.                                            |
| `media`        | Media, one file | no       | Optional image. Asset URL used as `mediaUrl`.                |

Parser rules (`src/lib/contentful.ts`): entries missing required fields are
skipped, not fatal. Invalid `correctIndex` (non-integer, out of range)
drops that question. `pairwise` with != 2 options is dropped.
Unresolved links (no `include`) are skipped.

## Authoring steps

1. In the portfolio space, create content types `quiz` and `question` with the fields above.
2. Add `question` entries first (prompt, type, options, correct answer).
3. Add a `quiz` entry; link its `questions` in display order.
4. Publish quiz + all linked questions (unpublished links resolve empty).
5. Verify: open `/q/<slug>` — with `revalidate = 3600` edits appear within the hour.
