import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import voiceRouter from "./voice";
import invitesRouter from "./invites";
import webhooksRouter from "./webhooks";
import settingsRouter from "./settings";
import gameRouter from "./game";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/voice", voiceRouter);
router.use("/invites", invitesRouter);
router.use("/webhooks", webhooksRouter);
router.use("/settings", settingsRouter);
router.use("/game", gameRouter);

export default router;
