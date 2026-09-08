# Decisions

## Track C (UI) — 2026-09-08

- Standalone-first data: server pages try `/api/quizzes[/slug]` (Track A/B may not exist) and fall back to `fixtures/quiz.sample.json`, so all routes render with zero backend.
- Share codec lives in `quiz-runner.tsx` (`encodeShare`/`decodeShare`, base64url of `Answer[]`); `quiz.ts` is frozen and untouched. Results page decodes `?s=` client-side inside `Suspense` (required for `useSearchParams`).
- Keyboard: `1-4`/`A-D` answer directly, arrows move focus, `Enter` confirms. Auto-advance 180ms after select (0 when `prefers-reduced-motion`); transitions use `motion-reduce:transition-none`. Question changes announced via polite live region.
- Accent discipline: `accent #0071E3` only on interactive elements, progress fill, score numeral. Leaderboard histogram is monochrome neutral bars.
- Polling: leaderboard refetches `/api/leaderboard?slug=` every 3s; fetch failure resolves to the empty state ("No votes yet"), never an error wall.
- Primitives (`Card`, `AnswerRow`, `ProgressBar`, `ScoreNumeral`) in `src/components/ui.tsx` encode DESIGN.md tokens (rounded-2xl, hairline borders, 56px rows, 2px bar, 64pt numeral, system colors).
