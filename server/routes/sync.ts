import express, { Router, Request, Response, NextFunction } from "express";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

const router: Router = express.Router();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const syncQueue = new Queue("photo-sync", { connection: redis });
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Auth middleware to ensure user is logged in
 * TODO: Integrate with actual session/auth when Step 2 is complete
 */
function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  // For now, this is a placeholder
  // In production, this would check req.session.user
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * POST /sync/:accountId
 * Trigger manual sync for a specific Google Account
 */
router.post("/:accountId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Verify user owns this account
    const account = await prisma.googleAccount.findFirst({
      where: { id: accountId as string, userId: userId as string },
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    // Add job to queue
    const job = await syncQueue.add(
      "sync-account",
      { type: "sync-account", accountId, userId },
      {
        priority: 10, // High priority for manual sync
        removeOnComplete: true,
      }
    );

    res.status(202).json({
      message: "Sync started",
      jobId: job.id,
      accountId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /sync/:accountId error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /sync/all
 * Trigger sync for all accounts of the logged-in user
 */
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Add job to queue
    const job = await syncQueue.add(
      "sync-user",
      { type: "sync-user", userId },
      {
        priority: 5, // Normal priority for full-user sync
        removeOnComplete: true,
      }
    );

    res.status(202).json({
      message: "Full sync started for all accounts",
      jobId: job.id,
      userId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /sync/all error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /sync/status
 * Get status of sync jobs from BullMQ queue
 */
router.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get queue stats
    const counts = await syncQueue.getJobCounts();

    // Get recent jobs (both active and completed)
    const activeJobs = await syncQueue.getJobs(["active", "waiting", "delayed"], 0, 10);
    const completedJobs = await syncQueue.getJobs(["completed"], 0, 10);

    // Filter to jobs for this user only (optional)
    const userJobs = activeJobs.filter((job) => (job?.data as any)?.userId === userId);
    const userCompleted = completedJobs.filter((job) => (job?.data as any)?.userId === userId);

    res.status(200).json({
      queueStats: {
        active: counts.active,
        waiting: counts.waiting,
        delayed: counts.delayed,
        completed: counts.completed,
        failed: counts.failed,
      },
      userJobs: {
        activeCount: userJobs.length,
        completedCount: userCompleted.length,
        recentJobs: userJobs.map((job) => ({
          id: job?.id,
          data: job?.data,
          progress: job?.progress,
          attemptsMade: job?.attemptsMade,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET /sync/status error:", message);
    res.status(500).json({ error: message });
  }
});

export default router;
