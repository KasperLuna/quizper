/**
 * FROZEN CONTRACT for Tracks A/B/C. Do not change shapes without updating
 * fixtures/quiz.sample.json and all three tracks.
 */

export type QuestionType = "pairwise" | "mcq" | "boolean";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  /** mcq/boolean: answer options. pairwise: exactly 2 candidate names. */
  options: string[];
  /** mcq/boolean only: index into options. */
  correctIndex?: number;
  explanation?: string;
  mediaUrl?: string;
}

export interface Quiz {
  title: string;
  slug: string;
  description: string;
  theme?: string;
  questions: Question[];
}

/** One answered question, shared by attempt POST + share-URL codec. */
export interface Answer {
  questionId: string;
  /** mcq/boolean: chosen option index. pairwise: 0|1 = picked options[i]. */
  choice: number;
}

export interface Matchup {
  a: string;
  b: string;
}

export interface MemberScore {
  name: string;
  elo: number;
  votes: number;
}

/** Elo ported verbatim from vert-measure: K=32, 400-scale. */
export const START_ELO = 1500;
export const K_FACTOR = 32;

export function eloDelta(winnerElo: number, loserElo: number): number {
  const expectedWin = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  return Math.round(K_FACTOR * (1 - expectedWin));
}
