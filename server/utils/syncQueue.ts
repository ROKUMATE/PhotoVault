import { Queue } from "bullmq";
import Redis from "ioredis";

export interface SyncJobData {
  type: "sync-account" | "sync-user";
  accountId?: string;
  userId: string;
}

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const syncQueue = new Queue<SyncJobData>("photo-sync", {
  connection: redis,
});

export async function enqueueAccountSync(accountId: string, userId: string): Promise<string | number | undefined> {
  const job = await syncQueue.add(
    "sync-account",
    { type: "sync-account", accountId, userId },
    {
      priority: 10,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
      },
      removeOnFail: {
        age: 86400,
      },
    }
  );

  return job.id;
}

export async function enqueueUserSync(userId: string): Promise<string | number | undefined> {
  const job = await syncQueue.add(
    "sync-user",
    { type: "sync-user", userId },
    {
      priority: 5,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
      },
      removeOnFail: {
        age: 86400,
      },
    }
  );

  return job.id;
}
