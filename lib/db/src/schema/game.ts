import { pgTable, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gameStatsTable = pgTable("game_stats", {
  id: serial("id").primaryKey(),
  totalGames: integer("total_games").notNull().default(0),
  hackerWins: integer("hacker_wins").notNull().default(0),
  defenderWins: integer("defender_wins").notNull().default(0),
  activePlayers: integer("active_players").notNull().default(0),
});

export const insertGameStatsSchema = createInsertSchema(gameStatsTable).omit({ id: true });
export type InsertGameStats = z.infer<typeof insertGameStatsSchema>;
export type GameStats = typeof gameStatsTable.$inferSelect;
