import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  composer: text("composer").notNull().default("社区谱目"),
  level: text("level").notNull().default("自定义"),
  notesJson: text("notes_json").notNull(),
  musicXml: text("music_xml").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
