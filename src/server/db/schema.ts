import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Multi-project schema prefix. All quizper tables are `quizper_*`.
 */
export const createTable = pgTableCreator((name) => `quizper_${name}`);

/**
 * Elo standings per quiz. Seeded from Contentful candidates on first use.
 * Replaces vert-measure's data/scores.json.
 */
export const candidateRatings = createTable(
  "candidate_rating",
  (d) => ({
    quizSlug: d.varchar({ length: 128 }).notNull(),
    name: d.varchar({ length: 256 }).notNull(),
    elo: d.integer().default(1500).notNull(),
    votes: d.integer().default(0).notNull(),
  }),
  (t) => [
    index("candidate_rating_quiz_idx").on(t.quizSlug),
    index("candidate_rating_elo_idx").on(t.quizSlug, t.elo),
  ],
);

/** Every pairwise vote: winner/loser + applied Elo delta. */
export const pairwiseVotes = createTable(
  "pairwise_vote",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    quizSlug: d.varchar({ length: 128 }).notNull(),
    winner: d.varchar({ length: 256 }).notNull(),
    loser: d.varchar({ length: 256 }).notNull(),
    delta: d.integer().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("pairwise_vote_quiz_idx").on(t.quizSlug)],
);

/** Scored MCQ/boolean attempts. `answers` verified against Contentful on read. */
export const quizAttempts = createTable(
  "quiz_attempt",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    quizSlug: d.varchar({ length: 128 }).notNull(),
    answers: d.jsonb().$type<{ questionId: string; choice: number }[]>().notNull(),
    score: d.integer().notNull(), // percent 0-100, recomputed server-side
    displayName: d.varchar({ length: 64 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("quiz_attempt_quiz_idx").on(t.quizSlug)],
);
