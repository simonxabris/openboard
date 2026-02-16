import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { env } from "cloudflare:workers";

export function createDb() {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof createDb>;
