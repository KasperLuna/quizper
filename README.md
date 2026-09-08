# Quizper

Contentful-driven quiz platform. Authors edit quizzes in Contentful; the site
renders them in an Apple-clean runner. See `PRODUCT.md` and `DESIGN.md`.

## Quickstart

```bash
cp .env.example .env   # fill in Neon DATABASE_URL + Contentful keys
pnpm install
pnpm db:push           # create quizper_* tables on Neon
pnpm dev
```

Checks: `pnpm check` (lint + typecheck), `pnpm db:studio`.

## Tracks

- **A** content layer: `src/lib/contentful.ts`, `docs/content-model.md`
- **B** quiz engine: `src/server/db/`, `src/app/api/`
- **C** UI routes: `src/app/` (`/`, `/q/[slug]`, results, leaderboard)
- **D** finish gate: detector, screenshots, reviewer, `DESIGN.md` from built world

Shared contracts: `src/lib/quiz.ts`, `fixtures/quiz.sample.json`.
Decision log: `docs/decisions.md`.
