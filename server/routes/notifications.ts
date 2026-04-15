import express, { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUnseenNotifications } from "../services/notifications.js";

const router: Router = express.Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const notifications = await getUnseenNotifications(userId);
    res.status(200).json({
      count: notifications.length,
      notifications,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
