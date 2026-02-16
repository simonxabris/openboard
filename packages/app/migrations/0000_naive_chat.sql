CREATE TABLE `usage_events` (
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`id` text NOT NULL,
	`usage_day` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`reasoning_tokens` integer NOT NULL,
	`cache_read_tokens` integer NOT NULL,
	`cache_write_tokens` integer NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`event_sent_at` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `session_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "usage_events_session_id_not_empty" CHECK(length(trim("usage_events"."session_id")) > 0),
	CONSTRAINT "usage_events_id_not_empty" CHECK(length(trim("usage_events"."id")) > 0),
	CONSTRAINT "usage_events_input_tokens_non_negative" CHECK("usage_events"."input_tokens" >= 0),
	CONSTRAINT "usage_events_output_tokens_non_negative" CHECK("usage_events"."output_tokens" >= 0),
	CONSTRAINT "usage_events_reasoning_tokens_non_negative" CHECK("usage_events"."reasoning_tokens" >= 0),
	CONSTRAINT "usage_events_cache_read_tokens_non_negative" CHECK("usage_events"."cache_read_tokens" >= 0),
	CONSTRAINT "usage_events_cache_write_tokens_non_negative" CHECK("usage_events"."cache_write_tokens" >= 0),
	CONSTRAINT "usage_events_model_not_empty" CHECK(length(trim("usage_events"."model")) > 0),
	CONSTRAINT "usage_events_provider_not_empty" CHECK(length(trim("usage_events"."provider")) > 0),
	CONSTRAINT "usage_events_day_format" CHECK("usage_events"."usage_day" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `usage_events_user_session_event_sent_idx` ON `usage_events` (`user_id`,`session_id`,`event_sent_at`);--> statement-breakpoint
CREATE INDEX `usage_events_day_user_idx` ON `usage_events` (`usage_day`,`user_id`);--> statement-breakpoint
CREATE INDEX `usage_events_day_idx` ON `usage_events` (`usage_day`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`secret_key_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	CONSTRAINT "users_username_not_empty" CHECK(length(trim("users"."username")) > 0),
	CONSTRAINT "users_username_normalized_lowercase" CHECK("users"."username_normalized" = lower("users"."username_normalized")),
	CONSTRAINT "users_secret_key_hash_not_empty" CHECK(length(trim("users"."secret_key_hash")) > 0)
);
--> statement-breakpoint
CREATE INDEX `users_last_seen_idx` ON `users` (`last_seen_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_normalized_uq` ON `users` (`username_normalized`);