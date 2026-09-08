# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js 15 + Tailwind 4 + TypeScript + Drizzle ORM + `contentful` SDK + Neon Postgres via Vercel Marketplace (Free $0). Vercel deploy. Approved in grill Q8.

## Users

Public anonymous visitors on mobile and desktop. No accounts; optional display name per attempt. Low-friction: open link, answer, share result URL.

## Product Purpose

Quizper is a Contentful-driven quiz platform. Authors edit quizzes in Contentful; the site renders them in an Apple-clean runner. v1 mechanics: pairwise Elo vote (ported from unidata-vert-measure), multiple-choice, true/false. Success = a visitor finishes a quiz in under two minutes and shares the result link.

## Positioning

Open shareable results: every attempt produces a URL-encoded shareable result (`/r/[quizId]?s=...`) with no login wall. Contentful as CMS + Neon for votes/attempts only.

## Operating Context

Routes: `/` (quiz index) → `/q/[slug]` (runner) → `/q/[slug]/results` + per-quiz leaderboard (local display of Neon aggregates). Content model approved Q3: `quiz` (title, slug, description, theme) → references `question[]` (type: `pairwise` / `mcq` / `boolean`; prompt, options, correctIndex, explanation, media; `include: 2` on fetch). Pairwise uses Elo K=32 persisted per candidate; MCQ/boolean score as % with explanations. Leaderboard: Elo-ranked for pairwise, best-score for MCQ, one shared component with two sort modes.

## Capabilities and Constraints

- No auth in v1; anonymous attempts, optional display name.
- Contentful owns all question content; Neon owns `quiz_attempts`, `pairwise_votes`, `candidate_ratings` only.
- vert-measure behaviors preserved: least-votes-biased matchup sampling, serialized Elo updates (now Neon transactions), live-polling leaderboard + Elo histogram (restyled).
- Constraints: Neon Free limits (0.5 GB, ~100 CU-hours/mo, scale-to-zero); keep rows tiny, pooled `DATABASE_URL`.
- Undecided: rank-order/slider quiz types (v2); Upstash Redis for rate-limiting (later, if abused).

## Brand Commitments

Name: quizper. Visual direction pinned by user: simple and refined, inspired by Apple Design (Operate mode). vert-measure's purple gradient look is explicitly dead.

## Evidence on Hand

- `../unidata-vert-measure/src/app/page.tsx`, `leaderboard/page.tsx`, `src/lib/scores.ts`, `src/app/api/{matchup,vote,leaderboard}/route.ts` — mechanic reference.
- `../personal-portfolio/lib/contentful.ts` — Contentful client/fetch pattern to port.
- `quizper/` empty — greenfield, no incumbent visual truth.

## Product Principles

1. Answer first, chrome last: one question per viewport, one primary action.
2. CMS edits, zero deploys: content changes never require code changes.
3. Shareability over accounts: a result URL beats a profile page.
4. Honest scoring: show correct answers, explanations, and Elo deltas; never invent testimonials or claims.

## Accessibility & Inclusion

Keyboard-first (1/2/A–D + arrows, 44pt targets), visible focus, `prefers-reduced-motion` respected, light + dark system themes, semantic landmarks + live regions for question transitions.
