import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "~/env";
import * as schema from "./schema";

// Neon HTTP driver: one-shot queries, no TCP pooling needed on serverless.
const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });
