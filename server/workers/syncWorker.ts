import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { syncPhotosForAccount, syncPhotosForUser } from "../services/photoSync.js";
import { isRetryableError } from "../utils/backoff.js";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface SyncJobData {
  type: "sync-account" | "sync-user";
  accountId?: string;
  userId: string;
}

/**
 * BullMQ Worker for sync jobs
 * - Processes one job at a time
 * - Handles exponential backoff and retries
 */
const syncWorker = new Worker<SyncJobData>(
  "photo-sync",
  async (job: Job<SyncJobData>) => {
    console.log(`[Worker] Processing job ${job.id}: ${job.data.type}`);

    try {
      let result;

      if (job.data.type === "sync-account") {
        if (!job.data.accountId) {
          throw new Error("accountId required for sync-account job");
        }
        result = await syncPhotosForAccount(job.data.accountId);
      } else if (job.data.type === "sync-user") {
        result = await syncPhotosForUser(job.data.userId);
      } else {
        throw new Error(`Unknown sync job type: ${(job.data as any).type}`);
      }

      console.log(`[Worker] Job ${job.id} completed successfully`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Worker] Job ${job.id} failed:`, message);

      if (!isRetryableError(error)) {
        job.discard();
      }

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 1, // Process one job at a time
  }
);

syncWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

syncWorker.on("failed", (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);
});

syncWorker.on("error", (error) => {
  console.error(`[Worker] Error:`, error.message);
});

export default syncWorker;
