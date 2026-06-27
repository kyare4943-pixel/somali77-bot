import { Router } from "express";
import { db } from "@workspace/db";
import { botSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(botSettingsTable).limit(1);
  const s = rows[0];
  if (!s) return res.json({ prefix: "!", language: "en", logsChannelId: null, welcomeChannelId: null });
  res.json({ prefix: s.prefix, language: s.language, logsChannelId: s.logsChannelId, welcomeChannelId: s.welcomeChannelId });
});

router.patch("/", async (req, res) => {
  const body = req.body as Partial<{ prefix: string; language: string; logsChannelId: string | null; welcomeChannelId: string | null }>;
  const rows = await db.select().from(botSettingsTable).limit(1);
  if (rows.length === 0) {
    await db.insert(botSettingsTable).values({
      prefix: body.prefix ?? "!",
      language: body.language ?? "en",
      logsChannelId: body.logsChannelId ?? null,
      welcomeChannelId: body.welcomeChannelId ?? null,
    });
  } else {
    await db.update(botSettingsTable).set({
      prefix: body.prefix ?? rows[0].prefix,
      language: body.language ?? rows[0].language,
      logsChannelId: body.logsChannelId !== undefined ? body.logsChannelId : rows[0].logsChannelId,
      welcomeChannelId: body.welcomeChannelId !== undefined ? body.welcomeChannelId : rows[0].welcomeChannelId,
    }).where(eq(botSettingsTable.id, rows[0].id));
  }
  const updated = await db.select().from(botSettingsTable).limit(1);
  const u = updated[0]!;
  res.json({ prefix: u.prefix, language: u.language, logsChannelId: u.logsChannelId, welcomeChannelId: u.welcomeChannelId });
});

export default router;
