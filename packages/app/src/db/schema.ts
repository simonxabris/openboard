import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Claimed user identity used for leaderboard rows and ingestion auth.
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull(),
    secretKeyHash: text("secret_key_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("users_last_seen_idx").on(table.lastSeenAt),
    uniqueIndex("users_username_normalized_uq").on(table.usernameNormalized),
    check("users_username_not_empty", sql`length(trim(${table.username})) > 0`),
    check(
      "users_username_normalized_lowercase",
      sql`${table.usernameNormalized} = lower(${table.usernameNormalized})`,
    ),
    check("users_secret_key_hash_not_empty", sql`length(trim(${table.secretKeyHash})) > 0`),
  ],
);

// Latest usage snapshot per user session.
export const usageEvents = sqliteTable(
  "usage_events",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    id: text("id").notNull(),
    usageDay: text("usage_day").notNull(), // UTC day key: YYYY-MM-DD
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    reasoningTokens: integer("reasoning_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull(),
    cacheWriteTokens: integer("cache_write_tokens").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    eventSentAt: integer("event_sent_at", { mode: "timestamp_ms" }).notNull(),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sessionId] }),
    index("usage_events_user_session_event_sent_idx").on(
      table.userId,
      table.sessionId,
      table.eventSentAt,
    ),
    index("usage_events_day_user_idx").on(table.usageDay, table.userId),
    index("usage_events_day_idx").on(table.usageDay),
    check("usage_events_session_id_not_empty", sql`length(trim(${table.sessionId})) > 0`),
    check("usage_events_id_not_empty", sql`length(trim(${table.id})) > 0`),
    check("usage_events_input_tokens_non_negative", sql`${table.inputTokens} >= 0`),
    check("usage_events_output_tokens_non_negative", sql`${table.outputTokens} >= 0`),
    check("usage_events_reasoning_tokens_non_negative", sql`${table.reasoningTokens} >= 0`),
    check("usage_events_cache_read_tokens_non_negative", sql`${table.cacheReadTokens} >= 0`),
    check("usage_events_cache_write_tokens_non_negative", sql`${table.cacheWriteTokens} >= 0`),
    check("usage_events_model_not_empty", sql`length(trim(${table.model})) > 0`),
    check("usage_events_provider_not_empty", sql`length(trim(${table.provider})) > 0`),
    check(
      "usage_events_day_format",
      sql`${table.usageDay} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
  ],
);
