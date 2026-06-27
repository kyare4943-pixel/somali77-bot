import { pgTable, text, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botSettingsTable = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  prefix: text("prefix").notNull().default("!"),
  language: text("language").notNull().default("en"),
  logsChannelId: text("logs_channel_id"),
  welcomeChannelId: text("welcome_channel_id"),
  voiceEnabled: boolean("voice_enabled").notNull().default(false),
  voiceCategoryId: text("voice_category_id"),
  voiceChannelId: text("voice_channel_id"),
  voiceDefaultName: text("voice_default_name").notNull().default("🎮 {user}'s Channel"),
});

export const insertBotSettingsSchema = createInsertSchema(botSettingsTable).omit({ id: true });
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettingsTable.$inferSelect;
