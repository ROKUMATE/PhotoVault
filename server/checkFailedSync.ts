import dotenv from "dotenv";
import { Queue } from "bullmq";
import Redis from "ioredis";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });
dotenv.config();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const syncQueue = new Queue("photo-sync", { connection: redis });

async function main() {
  const failed = await syncQueue.getFailed(0, 10);
  console.log("Failed jobs:", failed.map(j => {
    let errRes = j.returnvalue;
    if (j.stacktrace && j.stacktrace[0].includes('AxiosError')) {
       // we can't easily extract response data from stacktrace
    }
    return j.failedReason;
  }));
  process.exit(0);
}
main();
