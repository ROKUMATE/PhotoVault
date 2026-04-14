import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import healthRoutes from "../routes/health.js";
import syncRoutes from "../routes/sync.js";
import syncWorker from "../workers/syncWorker.js";

dotenv.config();

const app: Express = express();
const port: number = Number(process.env.PORT || 3001);
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

// Initialize the sync worker
console.log("[Server] Initializing BullMQ sync worker...");
syncWorker.on("ready", () => {
  console.log("[Server] Sync worker ready and listening for jobs");
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Placeholder: auth middleware (to be implemented in Step 2 with OAuth)
app.use((req: AuthRequest, res: Response, next: NextFunction) => {
  // TODO: Replace with actual session/JWT verification when Step 2 is complete
  // For now, extract userId from header for testing
  req.userId = req.headers["x-user-id"] as string | undefined;
  next();
});

// Routes
app.use("/", healthRoutes);
app.use("/sync", syncRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received, shutting down gracefully...");
  await syncWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Server] SIGINT received, shutting down gracefully...");
  await syncWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`[Server] PhotoVault server listening on port ${port}`);
  console.log(`[Server] Sync routes available at http://localhost:${port}/sync/...`);
});
