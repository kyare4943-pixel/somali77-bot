import { Router } from "express";
import { db } from "@workspace/db";
import { webhooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(webhooksTable);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const { name, url, channelId, avatarUrl } = req.body as { name: string; url: string; channelId?: string | null; avatarUrl?: string | null };
  const [row] = await db.insert(webhooksTable).values({ name, url, channelId: channelId ?? null, avatarUrl: avatarUrl ?? null }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, channelId, avatarUrl } = req.body as { name?: string; channelId?: string | null; avatarUrl?: string | null };
  const [existing] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const [updated] = await db.update(webhooksTable).set({
    name: name ?? existing.name,
    channelId: channelId !== undefined ? channelId : existing.channelId,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : existing.avatarUrl,
  }).where(eq(webhooksTable.id, id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(webhooksTable).where(eq(webhooksTable.id, id));
  res.status(204).send();
});

router.post("/:id/send", async (req, res) => {
  const id = Number(req.params.id);
  const [wh] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id));
  if (!wh) return res.status(404).json({ error: "Not found" });

  const { content, username, embed } = req.body as {
    content?: string;
    username?: string;
    embed?: {
      title?: string;
      description?: string;
      color?: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      footerText?: string;
      authorName?: string;
      authorIconUrl?: string;
      timestamp?: boolean;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
    };
  };

  const payload: Record<string, unknown> = {};
  if (content) payload.content = content;
  if (username) payload.username = username;

  if (embed) {
    const e: Record<string, unknown> = {};
    if (embed.title) e.title = embed.title;
    if (embed.description) e.description = embed.description;
    if (embed.color) e.color = parseInt(embed.color.replace("#", ""), 16);
    if (embed.imageUrl) e.image = { url: embed.imageUrl };
    if (embed.thumbnailUrl) e.thumbnail = { url: embed.thumbnailUrl };
    if (embed.footerText) e.footer = { text: embed.footerText };
    if (embed.authorName) e.author = { name: embed.authorName, icon_url: embed.authorIconUrl };
    if (embed.timestamp) e.timestamp = new Date().toISOString();
    if (embed.fields?.length) e.fields = embed.fields;
    payload.embeds = [e];
  }

  try {
    const response = await fetch(wh.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok || response.status === 204) {
      res.json({ success: true, messageId: null });
    } else {
      res.status(400).json({ success: false, messageId: null });
    }
  } catch (e) {
    res.status(500).json({ success: false, messageId: null });
  }
});

export default router;
