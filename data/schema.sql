CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`meta` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`org` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`description` text,
	`order` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `guestbook` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`tech` text DEFAULT '[]' NOT NULL,
	`repo_url` text,
	`live_url` text,
	`image` text,
	`order` integer DEFAULT 0 NOT NULL
, `thumbnail` text, `images` text DEFAULT '[]' NOT NULL);

CREATE TABLE `site_content` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`icon_index` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 3 NOT NULL
, `icon` text DEFAULT '' NOT NULL);

