CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`usage_day` text NOT NULL,
	`tokens` integer NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "usage_events_tokens_non_negative" CHECK("usage_events"."tokens" >= 0),
	CONSTRAINT "usage_events_model_not_empty" CHECK(length(trim("usage_events"."model")) > 0),
	CONSTRAINT "usage_events_provider_not_empty" CHECK(length(trim("usage_events"."provider")) > 0),
	CONSTRAINT "usage_events_day_format" CHECK("usage_events"."usage_day" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `usage_events_user_occurred_idx` ON `usage_events` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `usage_events_day_user_idx` ON `usage_events` (`usage_day`,`user_id`);--> statement-breakpoint
CREATE INDEX `usage_events_day_idx` ON `usage_events` (`usage_day`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `users_last_seen_idx` ON `users` (`last_seen_at`);