import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import prisma from "../utils/prisma.js";
import { createStorageWarning } from "../services/notifications.js";

const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const queueConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

interface RebalanceJobData {
  type: "rebalance-check";
}

export const rebalanceQueue = new Queue<RebalanceJobData>("rebalance-check", {
  connection: queueConnection,
});

export const rebalanceWorker = new Worker<RebalanceJobData>(
  "rebalance-check",
  async (_job: Job<RebalanceJobData>) => {
    const accounts = await prisma.googleAccount.findMany({
      select: {
        id: true,
        userId: true,
        email: true,
        storageUsedBytes: true,
        storageTotalBytes: true,
      },
    });

    let warnings = 0;
    for (const account of accounts) {
      if (account.storageTotalBytes <= BigInt(0)) {
        continue;
      }

      const percentUsed = (Number(account.storageUsedBytes) / Number(account.storageTotalBytes)) * 100;
      if (percentUsed >= 90) {
        const message = `Warning: ${account.email} is ${percentUsed.toFixed(1)}% full`;
        await createStorageWarning(account.userId, message);
        warnings++;
      }
    }

    return {
      checkedAccounts: accounts.length,
      warnings,
    };
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

rebalanceWorker.on("failed", (job, error) => {
  console.error(`[Rebalance] Job ${job?.id} failed:`, error.message);
});

rebalanceWorker.on("completed", (job, result) => {
  console.log(`[Rebalance] Job ${job.id} complete`, result);
});

const REBALANCE_REPEAT_JOB_ID = "rebalance-check-daily";

export async function scheduleRebalanceCheck(): Promise<void> {
  await rebalanceQueue.add(
    "rebalance-check",
    { type: "rebalance-check" },
    {
      jobId: REBALANCE_REPEAT_JOB_ID,
      repeat: {
        every: 24 * 60 * 60 * 1000,
      },
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
      },
    }
  );
}

export async function closeRebalanceResources(): Promise<void> {
  await rebalanceWorker.close();
  await rebalanceQueue.close();
  await redisConnection.quit();
  await queueConnection.quit();
}

export default rebalanceWorker;
