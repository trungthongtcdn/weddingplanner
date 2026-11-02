CREATE TABLE `budget_items` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`title` text NOT NULL,
	`payer` text NOT NULL,
	`planned` integer DEFAULT 0 NOT NULL,
	`actual` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`key` text NOT NULL,
	`choice` text NOT NULL,
	`note` text,
	`confirmed` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_wedding_key_idx` ON `decisions` (`wedding_id`,`key`);--> statement-breakpoint
CREATE TABLE `funds` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`side` text NOT NULL,
	`bank_bin` text,
	`account_number` text,
	`account_name` text,
	`couple_can_view` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_wedding_side_idx` ON `funds` (`wedding_id`,`side`);--> statement-breakpoint
CREATE TABLE `gift_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`gift_id` text NOT NULL,
	`member_id` text,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`fund_id` text NOT NULL,
	`guest_id` text,
	`method` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`item_desc` text,
	`note` text,
	`raw_text` text,
	`match_status` text NOT NULL,
	`tx_ref` text,
	`received_at` text,
	`created_by_member_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fund_id`) REFERENCES `funds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `gift_fund_idx` ON `gifts` (`fund_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_fund_txref_idx` ON `gifts` (`fund_id`,`tx_ref`);--> statement-breakpoint
CREATE TABLE `guest_parties` (
	`guest_id` text NOT NULL,
	`party_id` text NOT NULL,
	PRIMARY KEY(`guest_id`, `party_id`),
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guests` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`side` text NOT NULL,
	`created_by_member_id` text,
	`name` text NOT NULL,
	`honorific` text,
	`phone` text,
	`group_name` text,
	`note` text,
	`status` text DEFAULT 'CHUA_MOI' NOT NULL,
	`call_result` text,
	`invite_token` text NOT NULL,
	`gift_code` text NOT NULL,
	`opened_at` integer,
	`sent_at` integer,
	`remind_opt_in` integer DEFAULT false NOT NULL,
	`thanked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_invite_token_unique` ON `guests` (`invite_token`);--> statement-breakpoint
CREATE INDEX `guest_wedding_idx` ON `guests` (`wedding_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guest_wedding_code_idx` ON `guests` (`wedding_id`,`gift_code`);--> statement-breakpoint
CREATE TABLE `member_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`token` text NOT NULL,
	`role` text NOT NULL,
	`label` text NOT NULL,
	`created_by` text NOT NULL,
	`used_by` text,
	`used_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_invites_token_unique` ON `member_invites` (`token`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_wedding_user_idx` ON `members` (`wedding_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otp_codes` (`phone`);--> statement-breakpoint
CREATE TABLE `outgoing_gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_name` text NOT NULL,
	`phone` text,
	`event_name` text NOT NULL,
	`event_date` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outgoing_user_idx` ON `outgoing_gifts` (`user_id`);--> statement-breakpoint
CREATE TABLE `parties` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`side` text NOT NULL,
	`name` text NOT NULL,
	`starts_at` text NOT NULL,
	`venue` text,
	`address` text,
	`seats_per_table` integer DEFAULT 10 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`wedding_id` text NOT NULL,
	`ceremony` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text,
	`assignee_member_id` text,
	`done` integer DEFAULT false NOT NULL,
	`template_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wedding_id`) REFERENCES `weddings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `task_wedding_idx` ON `tasks` (`wedding_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE TABLE `weddings` (
	`id` text PRIMARY KEY NOT NULL,
	`groom_name` text NOT NULL,
	`bride_name` text NOT NULL,
	`groom_region` text NOT NULL,
	`bride_region` text NOT NULL,
	`groom_province` text,
	`bride_province` text,
	`wedding_date` text NOT NULL,
	`groom_birth_year` integer,
	`bride_birth_year` integer,
	`invite_message` text,
	`gift_qr_enabled` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
