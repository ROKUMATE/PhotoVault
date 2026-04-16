import cors from "cors";
import dotenv from "dotenv";
import express, { Express } from "express";
import authRoutes from "../routes/auth.js";
import healthRoutes from "../routes/health.js";
import notificationsRoutes from "../routes/notifications.js";
import photosRoutes from "../routes/photos.js";
import storageRoutes from "../routes/storage.js";
import syncRoutes from "../routes/sync.js";
import uploadRoutes from "../routes/upload.js";
import { errorHandler, notFoundHandler } from "../middleware/error.js";
import { closeRebalanceResources, scheduleRebalanceCheck } from "../workers/rebalanceWorker.js";
import syncWorker from "../workers/syncWorker.js";
import prisma from "../utils/prisma.js";
import { attachUserFromHeader } from "../middleware/auth.js";

dotenv.config();

const app: Express = express();
const port: number = Number(process.env.PORT || 3001);

// Initialize the sync worker
console.log("[Server] Initializing BullMQ sync worker...");
syncWorker.on("ready", () => {
  console.log("[Server] Sync worker ready and listening for jobs");
});

scheduleRebalanceCheck()
  .then(() => {
    console.log("[Server] Rebalance check scheduled every 24 hours");
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Server] Failed to schedule rebalance check:", message);
  });

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Placeholder: auth middleware (to be implemented in Step 2 with OAuth)
app.use(attachUserFromHeader);

// Routes
app.use("/", healthRoutes);
app.use("/auth", authRoutes);
app.use("/sync", syncRoutes);
app.use("/photos", photosRoutes);
app.use("/upload", uploadRoutes);
app.use("/storage", storageRoutes);
app.use("/notifications", notificationsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received, shutting down gracefully...");
  await syncWorker.close();
  await closeRebalanceResources();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Server] SIGINT received, shutting down gracefully...");
  await syncWorker.close();
  await closeRebalanceResources();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`[Server] PhotoVault server listening on port ${port}`);
  console.log(`[Server] Sync routes available at http://localhost:${port}/sync/...`);
});
