import { createServerFn } from "@tanstack/solid-start";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../db";
import { usageEvents, users } from "../db/schema";
import { generateSecretKey, hashSecretKey, normalizeUsername } from "./user-auth";

const LEADERBOARD_LIMIT = 10;

export type LeaderboardEntry = {
  rank: number;
  name: string;
  tokens: number;
};

type LeaderboardScope = "daily" | "all-time";

type LeaderboardModelRow = {
  userId: string;
  username: string | null;
  tokens: number | string;
};

export type CreateUserResult =
  | { ok: true; username: string; secretKey: string }
  | {
      ok: false;
      error: "invalid_username" | "username_taken" | "create_user_failed";
      message: string;
    };

const createUserInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
});

function getUtcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getLeaderboardName(userId: string, username: string | null) {
  if (typeof username === "string" && username.trim().length > 0) {
    return username.trim();
  }

  return `user_${userId.slice(0, 8)}`;
}

async function fetchLeaderboard(scope: LeaderboardScope): Promise<LeaderboardEntry[]> {
  const db = createDb();

  const baseQuery = db
    .select({
      userId: usageEvents.userId,
      username: users.username,
      tokens: sql<number>`sum(${usageEvents.inputTokens} + ${usageEvents.outputTokens} + ${usageEvents.reasoningTokens} + ${usageEvents.cacheReadTokens} + ${usageEvents.cacheWriteTokens})`,
    })
    .from(usageEvents)
    .leftJoin(users, eq(users.id, usageEvents.userId));

  const rows = (
    scope === "daily"
      ? await baseQuery
          .where(eq(usageEvents.usageDay, getUtcDayKey()))
          .groupBy(usageEvents.userId, users.username)
      : await baseQuery.groupBy(usageEvents.userId, users.username)
  ) as Array<LeaderboardModelRow>;

  const byUser = new Map<string, { name: string; tokens: number }>();

  for (const row of rows) {
    const rowTokens = Number(row.tokens ?? 0);
    const current = byUser.get(row.userId) ?? {
      name: getLeaderboardName(row.userId, row.username),
      tokens: 0,
    };

    const next = {
      ...current,
      tokens: current.tokens + rowTokens,
    };
    byUser.set(row.userId, next);
  }

  return [...byUser.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, LEADERBOARD_LIMIT)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      tokens: entry.tokens,
    }));
}

export const createUser = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<CreateUserResult> => {
    const parsed = createUserInputSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_username",
        message: parsed.error.issues[0]?.message ?? "Invalid username",
      };
    }

    const username = parsed.data.username.trim();
    const usernameNormalized = normalizeUsername(username);
    const secretKey = generateSecretKey();
    const secretKeyHash = await hashSecretKey(secretKey);
    const db = createDb();

    try {
      const insertedRows = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          username,
          usernameNormalized,
          secretKeyHash,
        })
        .onConflictDoNothing({ target: users.usernameNormalized })
        .returning({ id: users.id });

      if (insertedRows.length === 0) {
        return {
          ok: false,
          error: "username_taken",
          message: "That username is already claimed",
        };
      }

      return {
        ok: true,
        username,
        secretKey,
      };
    } catch (error) {
      console.error("create_user_failed", error);
      return {
        ok: false,
        error: "create_user_failed",
        message: "Failed to create user",
      };
    }
  },
);

export const getDailyLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  return fetchLeaderboard("daily");
});

export const getAllTimeLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  return fetchLeaderboard("all-time");
});
