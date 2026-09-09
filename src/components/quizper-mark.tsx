import type { SVGProps } from "react";

/** Quizper mark: question bubble in Apple blue. Fixed brand colors. */
export function QuizperMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Quizper" {...props}>
      <path
        d="M32 4C16.5 4 4 15.4 4 29.5c0 8 4.2 15 10.6 19.3L12 60l12.6-6.1c2.4.5 4.9.7 7.4.7 15.5 0 28-11.4 28-25.5S47.5 4 32 4z"
        fill="#0071E3"
      />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize="31"
        fontWeight="700"
        fill="#fff"
        fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}
