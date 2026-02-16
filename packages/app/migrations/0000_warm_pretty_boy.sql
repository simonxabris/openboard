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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
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
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `apikey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`start` text,
	`prefix` text,
	`key` text NOT NULL,
	`user_id` text NOT NULL,
	`refill_interval` integer,
	`refill_amount` integer,
	`last_refill_at` integer,
	`enabled` integer DEFAULT true,
	`rate_limit_enabled` integer DEFAULT true,
	`rate_limit_time_window` integer DEFAULT 86400000,
	`rate_limit_max` integer DEFAULT 10,
	`request_count` integer DEFAULT 0,
	`remaining` integer,
	`last_request` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`permissions` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `apikey_key_idx` ON `apikey` (`key`);--> statement-breakpoint
CREATE INDEX `apikey_userId_idx` ON `apikey` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);