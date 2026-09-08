import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-card-dark ${className}`}
    >
      {children}
    </div>
  );
}

export function AnswerRow({
  label,
  hint,
  selected,
  focused,
  onSelect,
  index,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  focused?: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-focused={focused ? "true" : undefined}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 text-left text-[17px] leading-snug transition-transform duration-150 ease-out motion-reduce:transition-none ${
        selected
          ? "border-accent bg-accent/[0.08] dark:bg-accent/20"
          : focused
            ? "border-neutral-400 bg-white dark:border-neutral-500 dark:bg-card-dark"
            : "border-black/10 bg-white dark:border-white/15 dark:bg-card-dark"
      } active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${
          selected
            ? "border-accent bg-accent text-white"
            : "border-black/20 text-neutral-500 dark:border-white/25 dark:text-neutral-400"
        }`}
      >
        {selected ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.5 4.8 9 10 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          index + 1
        )}
      </span>
      <span className="flex-1 text-neutral-900 dark:text-neutral-100">
        {label}
      </span>
      {hint ? (
        <kbd
          aria-hidden="true"
          className="hidden shrink-0 rounded border border-black/10 px-1.5 py-0.5 text-[13px] text-neutral-500 sm:inline dark:border-white/15 dark:text-neutral-400"
        >
          {hint}
        </kbd>
      ) : null}
    </button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-[2px] w-full overflow-hidden bg-black/10 dark:bg-white/15"
    >
      <div
        className="h-full bg-accent transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ScoreNumeral({
  value,
  label = "Score",
}: {
  value: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span
        aria-label={`${label} ${value}`}
        className="text-accent text-[64px] leading-none font-bold tracking-tight tabular-nums"
      >
        {value}
      </span>
      <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </div>
  );
}
