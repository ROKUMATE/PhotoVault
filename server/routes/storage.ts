import express, { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getStorageSummary } from "../services/storageSummary.js";

const router: Router = express.Router();

router.get("/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const summary = await getStorageSummary(userId);
    res.status(200).json(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
