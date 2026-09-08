import "~/styles/globals.css";

import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Quizper",
  description: "Contentful-driven quizzes with shareable results",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* THESIS: one question per viewport, one primary action; refuses marketing chrome on task routes. OWN-WORLD: system neutrals + Apple-blue accent, rounded-2xl hairline cards, 64pt result numerals. STORY: visitor opens link, answers, shares result URL. FIRST VIEWPORT: large title, single card stack, sticky primary action. FORM: pinned Apple-Operate brief (user direction, beats roll). FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        {children}
      </body>
    </html>
  );
}
