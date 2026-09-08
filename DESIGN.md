# Design

<!-- impeccable:design-schema 1 -->

## Mode

Operate — visitor completes a quiz task. Scanability, one-question focus, native expectations.

## Color strategy

Restrained: system neutrals + one blue accent. Light-first (`#F5F5F7` ground, white cards, `text-neutral-900`), dark-system (`#000` ground, `#1C1C1E` cards). Accent `#0071E3` (Apple blue), success `#34C759`, error `#FF3B30`. No gradients outside subtle card elevation. Physical scene: answered on a phone in daylight or a laptop at night — system theme decides, never brand color.

## Typography

System stack only: `-apple-system, BlinkMacSystemFont, "SF Pro", Inter, system-ui`. Large-title 34/28 for quiz titles, headline 20 for prompts, body 17, footnote 13 secondary. No display faces.

## Material & components

- Cards: `rounded-2xl`, hairline `border-black/10 dark:border-white/15`, `shadow-sm`, white/`#1C1C1E` fill.
- Answer controls: full-width 56px rows, 16px radius, pressed scale `.98`, checkmark-reveal on select.
- Pairwise: two equal cards side-by-side (stacked on mobile), tap = vote.
- Progress: 2px top bar, accent fill, no %.
- Results: 64pt score numeral, per-question explanation list, share-URL + copy button.
- Leaderboard: grouped list rows + Elo histogram in monochrome bars.

## Motion

150–200ms ease-out only; `prefers-reduced-motion` disables. One transition per state change (card swap / bar fill).

## Layout

Single column `max-w-xl`, 20px gutters, 24px section rhythm, more space above headings than below. Quiz index: card list with title + question count + best score. Sticky bottom action bar on mobile.

## Anti-choices

No purple gradient (vert-measure look dead), no gamified confetti/XP, no marketing hero on task routes, no custom fonts, no accent outside interactive + progress + results numeral.
