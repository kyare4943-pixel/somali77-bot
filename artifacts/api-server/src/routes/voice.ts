import { Router } from "express";
import { db } from "@workspace/db";
import { botSettingsTable } from "@workspace/db";
import { getActiveTempChannels } from "../bot/index";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/config", async (_req, res) => {
  const rows = await db.select().from(botSettingsTable).limit(1);
  const s = rows[0];
  if (!s) {
    return res.json({ enabled: false, categoryId: null, channelId: null, defaultName: "🎮 {user}'s Channel" });
  }
  res.json({
    enabled: s.voiceEnabled,
    categoryId: s.voiceCategoryId,
    channelId: s.voiceChannelId,
    defaultName: s.voiceDefaultName,
  });
});

router.patch("/config", async (req, res) => {
  const body = req.body as Partial<{ enabled: boolean; categoryId: string | null; channelId: string | null; defaultName: string }>;
  const rows = await db.select().from(botSettingsTable).limit(1);
  if (rows.length === 0) {
    await db.insert(botSettingsTable).values({
      voiceEnabled: body.enabled ?? false,
      voiceCategoryId: body.categoryId ?? null,
      voiceChannelId: body.channelId ?? null,
      voiceDefaultName: body.defaultName ?? "🎮 {user}'s Channel",
    });
  } else {
    await db.update(botSettingsTable).set({
      voiceEnabled: body.enabled ?? rows[0].voiceEnabled,
      voiceCategoryId: body.categoryId !== undefined ? body.categoryId : rows[0].voiceCategoryId,
      voiceChannelId: body.channelId !== undefined ? body.channelId : rows[0].voiceChannelId,
      voiceDefaultName: body.defaultName ?? rows[0].voiceDefaultName,
    }).where(eq(botSettingsTable.id, rows[0].id));
  }
  const updated = await db.select().from(botSettingsTable).limit(1);
  const u = updated[0]!;
  res.json({ enabled: u.voiceEnabled, categoryId: u.voiceCategoryId, channelId: u.voiceChannelId, defaultName: u.voiceDefaultName });
});

router.get("/channels", (_req, res) => {
  res.json(getActiveTempChannels());
});

export default router;
