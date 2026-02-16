import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

// Stable anonymous identity used by leaderboard rows.
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('users_last_seen_idx').on(table.lastSeenAt)],
)

// Immutable usage events; id should come from the plugin for idempotent inserts.
export const usageEvents = sqliteTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usageDay: text('usage_day').notNull(), // UTC day key: YYYY-MM-DD
    tokens: integer('tokens').notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('usage_events_user_occurred_idx').on(table.userId, table.occurredAt),
    index('usage_events_day_user_idx').on(table.usageDay, table.userId),
    index('usage_events_day_idx').on(table.usageDay),
    check('usage_events_tokens_non_negative', sql`${table.tokens} >= 0`),
    check('usage_events_model_not_empty', sql`length(trim(${table.model})) > 0`),
    check('usage_events_provider_not_empty', sql`length(trim(${table.provider})) > 0`),
    check(
      'usage_events_day_format',
      sql`${table.usageDay} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
  ],
)
