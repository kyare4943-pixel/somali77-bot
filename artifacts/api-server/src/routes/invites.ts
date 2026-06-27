import { Router } from "express";
import { db } from "@workspace/db";
import { invitesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(invitesTable).orderBy(desc(invitesTable.total));
  res.json(rows);
});

router.get("/stats", async (_req, res) => {
  const rows = await db.select().from(invitesTable).orderBy(desc(invitesTable.total));
  const totalInvites = rows.reduce((s, r) => s + r.total, 0);
  const topInviter = rows[0]?.username ?? null;
  res.json({ totalInvites, totalMembers: rows.length, topInviter });
});

export default router;
