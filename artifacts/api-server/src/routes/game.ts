import { Router } from "express";
import { db } from "@workspace/db";
import { gameStatsTable } from "@workspace/db";

const router = Router();

router.get("/stats", async (_req, res) => {
  const rows = await db.select().from(gameStatsTable).limit(1);
  const s = rows[0];
  if (!s) return res.json({ totalGames: 0, hackerWins: 0, defenderWins: 0, activePlayers: 0 });
  res.json({
    totalGames: s.totalGames,
    hackerWins: s.hackerWins,
    defenderWins: s.defenderWins,
    activePlayers: s.activePlayers,
  });
});

export default router;
