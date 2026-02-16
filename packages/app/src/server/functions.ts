import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import { usageEvents, user } from "../db/schema";
import { auth } from "../lib/auth";

const LEADERBOARD_LIMIT = 10;

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  imageUrl: string | null;
  tokens: number;
};

type LeaderboardScope = "daily" | "all-time";

type LeaderboardModelRow = {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  tokens: number | string;
};

export type OnboardSetupResult =
  | { ok: true; username: string; apiKey: string }
  | {
      ok: false;
      error: "unauthorized" | "create_api_key_failed";
      message: string;
    };

function getUtcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHandle(value: string | null | undefined) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const raw = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!raw) return null;

  if (/^[a-zA-Z0-9_]{1,15}$/.test(raw)) {
    return raw;
  }

  return null;
}

function getLeaderboardHandle(userId: string, name: string | null, email: string | null) {
  const fromName = normalizeHandle(name);
  if (fromName) return fromName;

  const emailLocalPart = email?.split("@")[0];
  const fromEmail = normalizeHandle(emailLocalPart);
  if (fromEmail) return fromEmail;

  return `user_${userId.slice(0, 8)}`;
}

async function fetchLeaderboard(scope: LeaderboardScope): Promise<LeaderboardEntry[]> {
  const db = createDb();

  const baseQuery = db
    .select({
      userId: usageEvents.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      tokens: sql<number>`sum(${usageEvents.inputTokens} + ${usageEvents.outputTokens} + ${usageEvents.reasoningTokens} + ${usageEvents.cacheReadTokens} + ${usageEvents.cacheWriteTokens})`,
    })
    .from(usageEvents)
    .leftJoin(user, eq(user.id, usageEvents.userId));

  const rows = (
    scope === "daily"
      ? await baseQuery
          .where(eq(usageEvents.usageDay, getUtcDayKey()))
          .groupBy(usageEvents.userId, user.name, user.email, user.image)
      : await baseQuery.groupBy(usageEvents.userId, user.name, user.email, user.image)
  ) as Array<LeaderboardModelRow>;

  const byUser = new Map<string, { handle: string; imageUrl: string | null; tokens: number }>();

  for (const row of rows) {
    const rowTokens = Number(row.tokens ?? 0);
    const current = byUser.get(row.userId) ?? {
      handle: getLeaderboardHandle(row.userId, row.name, row.email),
      imageUrl: row.image,
      tokens: 0,
    };

    const next = {
      ...current,
      imageUrl: current.imageUrl ?? row.image,
      tokens: current.tokens + rowTokens,
    };
    byUser.set(row.userId, next);
  }

  return [...byUser.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, LEADERBOARD_LIMIT)
    .map((entry, index) => ({
      rank: index + 1,
      handle: entry.handle,
      imageUrl: entry.imageUrl,
      tokens: entry.tokens,
    }));
}

export const getOnboardSetup = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardSetupResult> => {
    try {
      const headers = getRequestHeaders();
      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return {
          ok: false,
          error: "unauthorized",
          message: "Sign in with X to continue onboarding.",
        };
      }

      const createdApiKey = await auth.api.createApiKey({
        headers,
        body: {
          name: "OpenBoard plugin key",
        },
      });

      return {
        ok: true,
        username: session.user.name?.trim() || session.user.email,
        apiKey: createdApiKey.key,
      };
    } catch (error) {
      console.error("create_api_key_failed", error);
      return {
        ok: false,
        error: "create_api_key_failed",
        message: "Failed to generate API key",
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
