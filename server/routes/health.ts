import express, { Router, Request, Response } from "express";

const router: Router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "photovault-server" });
});

export default router;
