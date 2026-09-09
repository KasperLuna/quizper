import { KasperLunaLogo } from "~/components/kasper-luna-logo";
import { QuizperMark } from "~/components/quizper-mark";

/** Mark + Quizper wordmark lockup. */
export function BrandHeader({ markSize = 32 }: { markSize?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <QuizperMark style={{ width: markSize, height: markSize }} />
      <span className="text-[28px] leading-none font-bold tracking-tight">
        Quizper
      </span>
    </span>
  );
}

/** Bridge-style "by KasperLuna" lockup for the homescreen header. */
export function ByLine() {
  return (
    <a
      href="https://kasperluna.com"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-neutral-500 transition-opacity hover:opacity-80 dark:text-neutral-400"
    >
      <span className="text-[11px] font-semibold tracking-[0.3em] uppercase">
        by
      </span>
      <KasperLunaLogo className="h-4 w-auto fill-neutral-900 dark:fill-white" />
    </a>
  );
}

/** Compact brand row used above quiz/versus/leaderboard/results content. */
export function TestHeader() {
  return (
    <span className="flex items-center gap-1.5">
      <QuizperMark style={{ width: 20, height: 20 }} />
      <span className="text-[15px] font-semibold tracking-tight">Quizper</span>
    </span>
  );
}
