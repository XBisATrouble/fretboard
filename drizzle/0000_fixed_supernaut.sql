CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`composer` text DEFAULT '社区谱目' NOT NULL,
	`level` text DEFAULT '自定义' NOT NULL,
	`notes_json` text NOT NULL,
	`music_xml` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
