import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invitesTable = pgTable("invites", {
  userId: text("user_id").primaryKey(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  total: integer("total").notNull().default(0),
  fake: integer("fake").notNull().default(0),
  left: integer("left").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInviteSchema = createInsertSchema(invitesTable);
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invitesTable.$inferSelect;
