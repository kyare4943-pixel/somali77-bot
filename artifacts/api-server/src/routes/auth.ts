import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const expected = process.env.DASHBOARD_PASSWORD ?? "admin1234";
  if (password === expected) {
    (req.session as any).authenticated = true;
    res.json({ authenticated: true, role: "admin" });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  if ((req.session as any).authenticated) {
    res.json({ authenticated: true, role: "admin" });
  } else {
    res.status(401).json({ authenticated: false, role: "guest" });
  }
});

export default router;
