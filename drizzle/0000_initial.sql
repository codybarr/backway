CREATE TABLE `snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `url` text NOT NULL,
  `normalized_url` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `snapshots_normalized_url_idx` ON `snapshots` (`normalized_url`);
--> statement-breakpoint
CREATE INDEX `snapshots_created_at_idx` ON `snapshots` (`created_at`);
--> statement-breakpoint
CREATE TABLE `assets` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `url` text NOT NULL,
  `hash` text NOT NULL,
  `content_type` text NOT NULL,
  `size` integer NOT NULL,
  FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assets_snapshot_id_idx` ON `assets` (`snapshot_id`);
--> statement-breakpoint
CREATE INDEX `assets_hash_idx` ON `assets` (`hash`);
--> statement-breakpoint
CREATE TABLE `captures` (
  `id` text PRIMARY KEY NOT NULL,
  `snapshot_id` text NOT NULL,
  `method` text NOT NULL,
  `status` text NOT NULL,
  `error` text,
  FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `captures_snapshot_id_idx` ON `captures` (`snapshot_id`);
--> statement-breakpoint
CREATE INDEX `captures_status_idx` ON `captures` (`status`);
