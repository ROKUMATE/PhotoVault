import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { syncPhotosForAccount, syncPhotosForUser } from "../services/photoSync.js";
import { isRetryableError, getBackoffMs } from "../utils/backoff.js";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

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

      // Check if error is retryable
      if (isRetryableError(error)) {
        const attempt = (job.attemptsMade || 0) + 1;

        if (attempt < 5) {
          // Max 5 retries
          const backoffMs = getBackoffMs(attempt - 1);
          console.log(
            `[Worker] Retrying job ${job.id} in ${backoffMs.toFixed(0)}ms (attempt ${attempt}/5)`
          );

          // Throw to trigger retry
          throw error;
        } else {
          console.error(`[Worker] Job ${job.id} failed after 5 retries`);
          throw new Error(`Max retries exceeded for job ${job.id}`);
        }
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
